pragma solidity ^0.5.8;

import "./Ownable.sol";
import "./SafeMath.sol";
import "./SafeTRC20.sol";
import "./Math.sol";

contract LockFactory is Ownable {
    
    using SafeMath for uint256;
    using SafeTRC20 for ITRC20;

    ITRC20 public tokenAddr;
    
    uint public _index;
    uint256[] uinAddr;
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    
    mapping(address => mapping(uint => Data)) stores;
    mapping(uint => address) dataIdInStore;
    
    event Cross(uint, uint chainId, address tokenAddress, uint256 amount , address _toaddress);
    event Rescue(address indexed dst, uint sad);
    event RescueToken(address indexed dst,address indexed token, uint sad);
    
    struct Data {
        uint _index;
        uint chainId;
        address tokenAddress;
        uint amount;
        address _toaddress;
        uint state;
    }
    
    constructor() public {
        _index = 0;
    }
    
    
    function lock(address _trc20, uint256 chainId, address tokenAddress, uint256 amount, address _toaddress) public returns(bool success){
        require (chainId > 0);
        require(_toaddress != address(0x0));
        require(_trc20 != address(0x0));
        require(tokenAddress != address(0x0));
        require (amount > 0);
        
        
        tokenAddr = ITRC20(_trc20);
        _totalSupply = _totalSupply.add(amount);
        _balances[msg.sender] = _balances[msg.sender].add(amount);
        tokenAddr.safeTransferFrom(msg.sender, address(this), amount);
        
        uint256 state = 1;
        _index += 1;
        Data memory data = Data(_index, chainId, tokenAddress, amount, _toaddress, state);
        stores[msg.sender][_index] = data;
        dataIdInStore[_index] = msg.sender;
        
        emit Cross(_index, chainId, tokenAddress, amount, _toaddress);
        
        return true;
    }
    
    function getData(uint _index) view public returns(uint,uint,address,uint,address,uint){
       Data memory data = stores[dataIdInStore[_index]][_index];
       return(data._index, data.chainId, data.tokenAddress, data.amount, data._toaddress, data.state);
    }
    
    function updateState(uint _index, uint state) public onlyOwner returns (bool) {
        stores[dataIdInStore[_index]][_index].state = state;
        return true;
    } 
    
   /**
    * @dev rescue simple transfered eth.
    */
    function rescue(address payable to_, uint256 amount_)
    external
    onlyOwner
    {
        require(to_ != address(0), "must not 0");
        require(amount_ > 0, "must gt 0");

        to_.transfer(amount_);
        emit Rescue(to_, amount_);
    }

    /**
     * @dev rescue simple transfered unrelated token.
    */
     
    function rescue(address to_, ITRC20 token_, uint256 amount_)
    external
    onlyOwner
    {
        require(to_ != address(0), "must not 0");
        require(amount_ > 0, "must gt 0");

        token_.transfer(to_, amount_);
        emit RescueToken(to_, address(token_), amount_);
    }
    
    // function getIndexArr() public view returns(uint256[] memory){
    //     return _indexArr;
    // }
}


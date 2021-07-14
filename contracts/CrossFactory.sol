pragma solidity ^0.5.8;
pragma experimental ABIEncoderV2;

import "./Ownable.sol";
import "./SafeMath.sol";
import "./SafeTRC20.sol";
import "./Math.sol";
import "./SchnorrVerifier.sol";
import "./Schnorr.sol";
import "./SafeTRC20.sol";
import "./Curve.sol";
import "./Search.sol";


contract CrossFactory is Ownable {
    
    using SafeMath for uint256;
    using SafeTRC20 for ITRC20;

    uint public _nonce;
    uint public _chainId;

    address public _admin;
    address[] nodeAddress;
    
    // mapping(address => mapping(uint => Data)) lockStores;
    // mapping(address => mapping(uint => Data)) mintStores;
    
    event Cross2(CrossData data, string crossType);
    // event Cross(address fromToken, uint chainId, address targetToken, uint256 amount , address received, string crossType, bytes32 message);
    event Rescue(address indexed dst, uint sad);
    event RescueToken(address indexed dst,address indexed token, uint sad);

    struct CrossData {
        uint nonce;
        uint fromChainId;
        uint targetChainId;
        address fromToken;
        address targetToken;
        uint amount;
        address sender;
        address received;
        bytes32 message;
        uint state;
    }

    CrossData crossData;

    struct SnapShot{
        uint lastCrossNonce;
        uint[] crossList;
    }

    mapping(address => SnapShot) public accountCrossList;
    mapping(uint => CrossData) public allStoreList;

    constructor(address admin, uint chainId) public {
        _nonce = 0;
        _admin = admin;
        _chainId = chainId;
        nodeAddress.push(admin);
    }
    
    
    function lock(address fromToken, uint256 targetChainId, address targetToken, uint256 amount, address received) public returns(bool success){
        require (targetChainId > 0);
        require(received != address(0x0));
        require(fromToken != address(0x0));
        require(targetToken != address(0x0));
        require (amount > 0);
        
        
        ITRC20 tokenAddr = ITRC20(fromToken);
        tokenAddr.safeTransferFrom(msg.sender, address(this), amount);


        _nonce++;
        crossData = CrossData(_nonce, _chainId, targetChainId, fromToken, targetToken, amount, msg.sender, received, bytes32(0), 1);
        accountCrossList[msg.sender].lastCrossNonce = _nonce;
        accountCrossList[msg.sender].crossList.push(_nonce);
        allStoreList[_nonce] = crossData;

        // emit Cross(fromToken, targetChainId, targetToken, amount, received, 'lock', bytes32(0));
        emit Cross2(crossData, 'lock');
        
        return true;
    }

    /**
        update cross state
     */
    function updateState(uint nonce, uint state) public onlyOwner returns (bool) {
        allStoreList[nonce].state = state;
        return true;
    } 


    function bytesToBytes32(bytes memory b, uint offset) internal pure returns (bytes32) {
        bytes32 out;
        for (uint i = 0; i < 32; i++) {
          out |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
        }
        return out;
    }

    /**
        verify signature
     */
    function verifySign(bytes32 pkx, bytes32 message, bytes memory sign)
    public view
    returns (bool){
        bytes32 r = bytesToBytes32(sign, 0);
        bytes32 s = bytesToBytes32(sign, 32);
        
        uint256 PKx = uint256(pkx);
        
        (uint256 bete, uint256 pky) = Curve.FindYforX(PKx);
        bytes32 PKy = bytes32(pky);
        
        return SchnorrVerifier.verify(r, s, pkx, PKy, message);
        
    }
    
    function mint(bytes32 pkx, bytes32 message, bytes memory sign, address targetToken, uint amount, address received, uint fromChainId) public returns(bool success){
        require(received != address(0x0));
        require(targetToken != address(0x0));
        require (amount > 0);
        
        bool isExist = Search.indexOfAddress(nodeAddress, msg.sender);
        require(isExist == true, 'address error');
        // step1 - verify first
        bool res = verifySign(pkx, message, sign);
        require(res == true,'sign error');
        // step2 - mint transfer
        ITRC20 tokenAddr = ITRC20(targetToken);
        tokenAddr.safeTransfer(received, amount);


        _nonce++;
        crossData = CrossData(_nonce, fromChainId, _chainId, address(0), targetToken, amount, address(0), received, message, 2);
        accountCrossList[received].lastCrossNonce = _nonce;
        accountCrossList[received].crossList.push(_nonce);
        allStoreList[_nonce] = crossData;

        emit Cross2(crossData, 'mint');
        // emit Cross(address(0), fromChainId, targetToken, amount, received, 'mint', message);

        return true;
    }
    
    function setAddress(address[] memory _address) public returns(address[] memory){
        nodeAddress = _address;
        return nodeAddress;
    }
    
    function getAddress() public view returns(address[] memory){
        return nodeAddress;
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

    /**
        get token balance 
     */
    function getBalanceOf(address token) view public returns (uint256 balance){
        ITRC20 tokenAddr = ITRC20(token);
        return tokenAddr.balanceOf(address(this));
    }
    
}
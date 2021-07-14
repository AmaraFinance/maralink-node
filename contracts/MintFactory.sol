pragma solidity ^0.5.16;

import "./SafeMath.sol";
import "./SchnorrVerifier.sol";
import "./Schnorr.sol";
import "./SafeTRC20.sol";
import "./Math.sol";
import "./Ownable.sol";
import "./Curve.sol";
import "./Search.sol";

contract MintFactory is Ownable{
    using SafeMath for uint;
    using SafeTRC20 for ITRC20;


    address public admin;
    address[] addressArr;
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    constructor(address admin_) public {
        admin = admin_;
        addressArr.push(admin_);
    }

    event Cross(address tokenAddress, uint256 amount , address _toaddress);
    event Rescue(address indexed dst, uint sad);
    event RescueToken(address indexed dst,address indexed token, uint sad);

    function() external payable { }

    /// @notice       convert bytes to bytes32
    /// @param b      bytes array
    /// @param offset offset of array to begin convert
    function bytesToBytes32(bytes memory b, uint offset) internal pure returns (bytes32) {
        bytes32 out;
        for (uint i = 0; i < 32; i++) {
          out |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
        }
        return out;
    }

    function CreateProof( uint256 secret, uint256 message )  view public returns  (uint256[2] memory out_pubkey, uint256 out_s, uint256 out_e){
        return Schnorr.CreateProof(secret, message);
    }
    
    // function verifySign(bytes32 pk, bytes32 message, bytes memory sign, address _trc20, uint amount, address received)
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
    
    function mint(bytes32 pkx, bytes32 message, bytes memory sign, address _trc20, uint amount, address received) public returns(bool success){
        require(received != address(0x0));
        require(_trc20 != address(0x0));
        require (amount > 0);
        
        bool isExsit = Search.indexOfAddress(addressArr, msg.sender);
        require(isExsit == true, 'address error');
        // TODO: step1 - verify first
        bool res = verifySign(pkx,message,sign);
        require(res == true,'sign error');
        // step2 - transfer
        
        ITRC20 tokenAddr = ITRC20(_trc20);
        tokenAddr.safeTransfer(received, amount);
        emit Cross(_trc20, amount, received);

        return true;
    }
    
    function setAddress(address[] memory _address) public returns(address[] memory){
        addressArr = _address;
        return addressArr;
    }
    
    function getAddress() public view returns(address[] memory){
        return addressArr;
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

    
}
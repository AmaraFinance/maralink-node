pragma solidity ^0.5.8;
pragma experimental ABIEncoderV2;

import "./SchnorrVerifier.sol";
import "./Ownable.sol";
import "./CrossStorage.sol";
import "./CrossFactory.sol";

contract CrossDelegate is Ownable, SchnorrVerifier, CrossStorage {
    using SafeMath for uint256;
    using SafeTRC20 for ITRC20;

    event Cross2(CrossData data, string crossType);
    // event Cross(address fromToken, uint chainId, address targetToken, uint256 amount , address received, string crossType, bytes32 message);
    event Rescue(address indexed dst, uint sad);
    event RescueToken(address indexed dst, address indexed token, uint sad);

    event AddNode(address nodeAddress_);
    event DeleteNode(address nodeAddress_);

    event NewApplyFactor(uint oldApplyFactorMantisa, uint applyFactorMantisa);

    constructor() public {

    }


    function _become(CrossFactory crossFactory) public {
        require(msg.sender == crossFactory._admin(), "only crossFactory admin can change brains");
        require(crossFactory._acceptImplementation() == 0, "change not authorized");
    }

    function _setChainId(uint chainId) public returns (bool){
        require(chainId > 0, "chainId must greate than 0");
        _chainId = chainId;
        return true;
    }

    function _setMinApplyFactorMantisa(uint newApplyFactorMantisa) public onlyOwner returns (bool){
        uint oldApplyFactorMantisa = applyFactorMantisa;
        applyFactorMantisa = newApplyFactorMantisa;
        emit NewApplyFactor(oldApplyFactorMantisa, applyFactorMantisa);
        return true;
    }

    function _setLockPause(bool state) public onlyOwner returns (bool){
        lockPause = state;
        return lockPause;
    }

    function _setMintPause(bool state) public onlyOwner returns (bool){
        mintPause = state;
        return mintPause;
    }

    function getNodeList() public view returns (NodeItem[] memory){
        return nodeList;
    }


    function addNodeItem(address nodeAddress_, uint256 publicKey) public onlyOwner returns (bool){
        for (uint i = 0; i < nodeList.length; i++) {
            if (nodeList[i].nodeAddress == nodeAddress_) {
                revert("Node address is existed");
                break;
            }
        }

        NodeItem memory nodeItem = NodeItem({publicKey : publicKey, nodeAddress : nodeAddress_});
        nodeList.push(nodeItem);

        emit AddNode(nodeAddress_);
        return true;
    }

    function deleteNodeItem(address nodeAddress_) public onlyOwner returns (bool){
        uint len = nodeList.length;
        uint assetIndex = len;
        for (uint i = 0; i < len; i++) {
            if (nodeList[i].nodeAddress == nodeAddress_) {
                assetIndex = i;
                break;
            }
        }

        //is in or not
        assert(assetIndex < len);

        nodeList[assetIndex] = nodeList[len - 1];
        nodeList.length--;

        emit DeleteNode(nodeAddress_);
        return true;
    }


    function filterNodeList() internal view returns (address[] memory){
        uint len = nodeList.length;
        address[] memory nodeAddress = new address[](len);
        for (uint i = 0; i < len; i++) {
            nodeAddress[i] = nodeList[i].nodeAddress;
        }
        return (nodeAddress);
    }

    function getPublicKeyByAddress(address nodeAddress_) public view returns (bool, uint256){
        uint len = nodeList.length;
        uint256 publicKey;
        bool isExist = false;
        for (uint i = 0; i < len; i++) {
            if (nodeList[i].nodeAddress == nodeAddress_) {
                publicKey = nodeList[i].publicKey;
                isExist = true;
                break;
            }
        }
        return (isExist, publicKey);
    }

    function getPublicKeysByConfig(address[] memory nodeArr) public view returns (uint256[] memory){
        uint len = nodeArr.length;
        uint256[] memory publicKeys = new uint256[](len);
        for (uint i = 0; i < len; i++) {
            (bool isExist, uint256 publicKey) = getPublicKeyByAddress(nodeArr[i]);
            if (isExist) {
                publicKeys[i] = publicKey;
            }
        }
        return (publicKeys);
    }

    function bytesToBytes32(bytes memory b, uint offset) internal pure returns (bytes32) {
        bytes32 out;
        for (uint i = 0; i < 32; i++) {
            out |= bytes32(b[offset + i] & 0xFF) >> (i * 8);
        }
        return out;
    }

    function getCombinePubkey(address[] memory nodeArr) public view returns (uint256, uint256){
        uint256[] memory publicKeys = getPublicKeysByConfig(nodeArr);
        return SchnorrVerifier.getCombinePubkey(publicKeys);
    }

    function lock(address fromToken, uint256 targetChainId, address targetToken, uint256 amount, address received) public returns (bool success){
        require(targetChainId > 0);
        require(received != address(0x0), 'must not zone');
        require(fromToken != address(0x0), 'must not zone');
        require(targetToken != address(0x0), 'must not zone');
        require(amount > 0, 'must greater than 0');
        require(lockPause == false, 'lock is pause');

        ITRC20 tokenAddr = ITRC20(fromToken);
        tokenAddr.safeTransferFrom(msg.sender, address(this), amount);

        _nonce++;
        crossData = CrossData(_nonce, _chainId, targetChainId, fromToken, targetToken, amount, msg.sender, received, bytes32(0), 1, now);
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

    /**
        verify signature
     */
    function verifySign(address[] memory nodeArr, bytes32 message, bytes memory sign) public view returns (bool){
        bytes32 r = bytesToBytes32(sign, 0);
        bytes32 s = bytesToBytes32(sign, 32);
        (uint256 px,) = getCombinePubkey(nodeArr);
        (, uint256 py) = Curve.FindYforX(px);
        return SchnorrVerifier.verify(r, s, bytes32(px), bytes32(py), message);
    }


    // function mint(address[] memory nodeArr, bytes32 message, bytes memory sign, address targetToken, uint amount, address received, uint fromChainId) public returns(bool success){
    function mint(bytes32 message, address targetToken, uint amount, address received, uint fromChainId) public returns (bool success){
        require(received != address(0x0), "received address must be entered");
        require(targetToken != address(0x0), "targetToken address must be entered");
        require(amount > 0, "amount must be greater than 0");
        require(mintPause == false, 'mint is pause');

        address[] memory nodeAddress = filterNodeList();
        bool isExist = Search.indexOfAddress(nodeAddress, msg.sender);
        require(isExist == true, 'address error');


        // require(nodeArr.length * mantisa > nodeList.length * applyFactorMantisa , 'apply number error');

        // step1 - verify first
        // bool res = verifySign(nodeArr, message, sign);
        // require(res == true,'sign error');
        // step2 - mint transfer
        ITRC20 tokenAddr = ITRC20(targetToken);
        tokenAddr.safeTransfer(received, amount);


        _nonce++;
        // crossData = CrossData(_nonce, fromChainId, _chainId, address(0), targetToken, amount, msg.sender, received, message, 2);
        crossData = CrossData(_nonce, fromChainId, _chainId, address(0), targetToken, amount, msg.sender, received, message, 2, now);
        accountCrossList[received].lastCrossNonce = _nonce;
        accountCrossList[received].crossList.push(_nonce);
        allStoreList[_nonce] = crossData;

        emit Cross2(crossData, 'mint');
        // emit Cross(address(0), fromChainId, targetToken, amount, received, 'mint', message);

        return true;
    }

    /**
     * @dev rescue simple transfered eth.
     */
    function rescue(address payable to_, uint256 amount_) external onlyOwner {
        require(to_ != address(0), "must not 0");
        require(amount_ > 0, "must gt 0");

        to_.transfer(amount_);
        emit Rescue(to_, amount_);
    }

    /**
     * @dev rescue simple transfered unrelated token.
    */
    function rescue(address to_, ITRC20 token_, uint256 amount_) external onlyOwner {
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
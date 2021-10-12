pragma solidity ^0.5.8;

contract CrossAdminStorage {
    /**
    * @notice Administrator for this contract
    */
    address public _admin;

    /**
    * @notice Pending administrator for this contract
    */
    address public pendingAdmin;

    /**
    * @notice Active brains of Unitroller
    */
    address public comptrollerImplementation;

    /**
    * @notice Pending brains of Unitroller
    */
    address public pendingComptrollerImplementation;
}

contract CrossStorage is CrossAdminStorage{

    uint public _nonce = 0;
    uint public _chainId;

    uint public applyFactorMantisa = 0.5e18;
    uint public constant mantisa = 1e18;

    bool public lockPause = false;
    bool public mintPause = false;

    struct NodeItem{
        uint256 publicKey;
        address nodeAddress;
    }

    NodeItem[] public nodeList;

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
        uint timestamp;
    }

    CrossData crossData;

    struct SnapShot{
        uint lastCrossNonce;
        uint[] crossList;
    }

    mapping(address => SnapShot) public accountCrossList;
    mapping(uint => CrossData) public allStoreList;
}
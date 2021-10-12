pragma solidity ^0.5.8;


// import "./Farm.sol";
import "./SafeTRC20.sol";

interface FarmInterface {
    function testFarm() view external returns (address, address);
    function stake(uint256 amount,address account) external;
}

interface ComptrollerInterface {
    function claimComp(address holder, uint amount) external returns (bool);
}

//0xbd440D18d442562Eea111ea6E1D8c8e3bc0c9e96
contract Test {
    using SafeTRC20 for ITRC20;

    address public owner;

    constructor() public{
        owner = msg.sender;
    }

     modifier onlyOwner() {
        require(owner == msg.sender, "You are not owner");
        _;
    }

    function test(address farmAddress_) view public returns (address){
        // address(farmAddress).delegatecall(abi.encodeWithSignature("testFarm()"));
        (bool success, bytes memory returndata) = address(farmAddress_).staticcall(abi.encodeWithSignature("tokenAddr()"));
        if(success){
            return abi.decode(returndata, (address));
        }else{
            return address(0);
        }
    }

     function test2(address comtroller, address account) view public returns (uint256){
        (bool success, bytes memory returndata) = address(comtroller).staticcall(abi.encodeWithSignature("compAccrued(address)", account));
        if(success){
            return abi.decode(returndata, (uint256));
        }else{
            return 0x0;
        }
        
    }

    function delegateCall(address comtroller, uint256 amount, address account) public returns (bool){
    // function delegateCall(address farmAddress_, uint256 amount, address account) public returns (bool, bytes memory){
        ComptrollerInterface comp = ComptrollerInterface(comtroller);
        comp.claimComp(account, amount);
        return (true);
        // return address(farmAddress).delegatecall(abi.encodeWithSignature("stake(uint256,address)", amount, account));
    }

     function destroyContract() external onlyOwner{
        selfdestruct(msg.sender); // 销毁合约
    }

    
    function withdraw(uint256 amount, address account, address tokenAddr) public {
        ITRC20(tokenAddr).safeTransfer(account, amount);
    }


    function getTestInfo() public view returns (uint){
        return uint(-1);
    }

    function getTestInfo2(uint info) public view returns (bool){
        return info == uint(-1);
    }
}

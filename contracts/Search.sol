pragma solidity ^0.5.16;

contract Search {
    function indexOf(uint[] memory self, uint value)
        public
        view
        returns (uint)
    {
        for (uint i = 0; i < self.length; i++)
            if (self[i] == value) return i;
        return uint(-1);
    }
    
    function indexOfAddress(address[] memory self, address value)
        public
        view
        returns (bool)
    {
        for (uint i = 0; i < self.length; i++)
            if (self[i] == value) return true;
        return false;
    }
    
}
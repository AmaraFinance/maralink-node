pragma solidity  ^0.5.16;

import "./Secp256k1.sol";
import "./Curve.sol";
import "./SafeMath.sol";
// import "./strings.sol";

// pragma experimental ABIEncoderV2;

library SchnorrVerifier {
    using SafeMath for uint;
    // using strings for *;
    struct Point {
        uint256 x; uint256 y;
    }
    uint256 constant n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;
    struct Verification {
        Point groupKey;
        Point randomPoint;
        uint256 signature;
        bytes32 message;

        uint256 _hash;
        Point _left;
        Point _right;
    }


    function h(bytes32 m, uint256 a, uint256 b) public pure returns (uint256) {
        return uint256(sha256(abi.encodePacked(m, uint8(0x04), a, b)));
    }

    // function cmul(Point p, uint256 scalar) public pure returns (uint256, uint256) {
    function cmul(uint256 x, uint256 y, uint256 scalar) public pure returns (uint256, uint256) {
        return Secp256k1.ecmul(x, y, scalar);
    }

    function sg(uint256 sig_s) public pure returns (uint256, uint256) {
        return Secp256k1.ecmul(Secp256k1.getGx(), Secp256k1.getGy(), sig_s);
    }

    // function cadd(Point a, Point b) public pure returns (uint256, uint256) {
    function cadd(uint256 ax, uint256 ay, uint256 bx, uint256 by) public pure returns (uint256, uint256) {
        return Secp256k1.ecadd(ax, ay, bx, by);
    }

    function g1neg(Point memory p) pure internal returns (Point memory) {
		// The prime q in the base field F_q for G1
		uint q = 115792089237316195423570985008687907853269984665640564039457584007908834671663;
		if (p.x == 0 && p.y == 0)
			return Point(0, 0);
		return Point(p.x, q - (p.y % q));
	}

    function toBytesNicolasMassart(uint256 x) pure internal returns (bytes memory) {
        bytes32 b = bytes32(x);
        bytes memory c = new bytes(32);
        for (uint i = 0; i < 32; i++) {
            c[i] = b[i];
        }
        return c;
    }

    function toBytesEth(uint256 x) pure internal returns (bytes memory b) {
        b = new bytes(32);
        for (uint i = 0; i < 32; i++) {
            b[i] = byte(uint8(x / (2**(8*(31 - i))))); 
        }
    }

    function bytesToUint(bytes memory b) pure internal returns (uint256){
        
        uint256 number;
        for(uint i= 0; i<b.length; i++){
            number = number + uint8(b[i])*(2**(8*(b.length-(i+1))));
        }
        return  number;
    }

   

    function concat(bytes32 rr, bytes32 ss, bytes32 message)  pure internal returns (bytes memory) {
        bytes memory r = toBytesEth(uint256(rr));
        bytes memory s = toBytesEth(uint256(ss));
        bytes memory m = toBytesEth(uint256(message));
        string memory ret = new string(r.length + s.length + m.length);
        bytes memory Ts = bytes(ret);
        uint k = 0;
        for(uint i = 0; i < r.length; i++) {
            Ts[k++] = r[i];
        }
        for(uint i = 0; i < s.length; i++) {
            Ts[k++] = s[i];
        }
        for(uint i = 0; i < m.length; i++) {
            Ts[k++] = m[i];
        }
        return Ts;
    }

    function getE(bytes32 rx, bytes32 px, bytes32 message) pure internal returns (uint256) {
        uint256 taghash = uint256(sha256(abi.encodePacked('BIP0340/challenge')));
        bytes memory Ts = abi.encodePacked(rx, px, message);
        uint256 hash = uint256(sha256(abi.encodePacked(taghash, taghash, Ts))) % n;
        return hash;
    }

    function getR(uint256 ss, uint256 e, Point memory groupKey) pure internal returns (Point memory) {
        Point memory sG;
        (sG.x, sG.y) = cmul( Secp256k1.getGx(), Secp256k1.getGy(),  ss );
        Point memory eP;
       
        (eP.x, eP.y) =  cmul( groupKey.x,  groupKey.y, e);
        Point memory ePng = g1neg(eP);

        (uint256 x, uint256 y) =  cadd(sG.x, sG.y, ePng.x, ePng.y);
        return Point(x, y);
    }

    function verify(bytes32 rr, bytes32 ss, bytes32 groupKeyX, bytes32 groupKeyY, bytes32 message)
        view
        public
        returns(bool)
    {
        bool flag = false;
        Verification memory state;

        state.groupKey.x = uint256(groupKeyX);
        state.groupKey.y = uint256(groupKeyY);
        state.message = message;

        state._hash = uint256(state.message);
        state._left.x = uint256(rr);
        state._left.y = uint256(ss);

        uint256 e = getE( rr, groupKeyX, message);

        Point memory R = getR(state._left.y, e,  state.groupKey);

        return ( R.x == state._left.x );
    }
}
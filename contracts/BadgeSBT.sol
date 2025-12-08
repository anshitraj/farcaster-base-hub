// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract BadgeSBT is ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    
    // Mapping to track minted badges: badgeType => appId => wallet => minted
    mapping(string => mapping(uint256 => mapping(address => bool))) public mintedBadges;
    
    // Mapping to track if a token has been minted
    mapping(uint256 => bool) private _mintedTokens;
    
    constructor(address initialOwner) ERC721("Base Mini App Builder Badges", "BMABB") Ownable(initialOwner) {}
    
    /**
     * @dev Mint "Cast Your App" badge for a developer who listed an app
     * @param to Address to mint the badge to
     * @param appId The app ID (uint256)
     * @param uri Metadata URI for the badge
     */
    function mintCastYourAppBadge(address to, uint256 appId, string memory uri) external onlyOwner {
        require(!mintedBadges["cast"][appId][to], "Badge already minted");
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId); // _update will set _mintedTokens[tokenId] = true
        _setTokenURI(tokenId, uri);
        mintedBadges["cast"][appId][to] = true;
    }
    
    /**
     * @dev Mint "App Developer" badge for the app owner
     * @param to Address to mint the badge to (must be owner from farcaster.json)
     * @param appId The app ID (uint256)
     * @param uri Metadata URI for the badge
     */
    function mintAppDeveloperBadge(address to, uint256 appId, string memory uri) external onlyOwner {
        require(!mintedBadges["developer"][appId][to], "Badge already minted");
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId); // _update will set _mintedTokens[tokenId] = true
        _setTokenURI(tokenId, uri);
        mintedBadges["developer"][appId][to] = true;
    }
    
    /**
     * @dev Legacy mint function for backward compatibility
     */
    function mintBadge(address to, string memory uri) external onlyOwner {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId); // _update will set _mintedTokens[tokenId] = true
        _setTokenURI(tokenId, uri);
    }
    
    /**
     * @dev Check if a badge has been minted
     */
    function hasBadge(string memory badgeType, uint256 appId, address wallet) external view returns (bool) {
        return mintedBadges[badgeType][appId][wallet];
    }
    
    // Override transfer functions to make it soulbound (non-transferable)
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721) returns (address) {
        // If token hasn't been minted yet, it's a mint - allow it
        // (The mint functions have onlyOwner modifier, so we trust they're called by owner)
        if (!_mintedTokens[tokenId]) {
            // This is a mint operation - allow it
            address result = super._update(to, tokenId, auth);
            // Mark as minted after successful update
            _mintedTokens[tokenId] = true;
            return result;
        }
        
        // If token exists, it's a transfer - block it (except for burning to address(0))
        require(to == address(0), "SBT: Cannot transfer");
        return super._update(to, tokenId, auth);
    }
    
    // Required override for ERC721URIStorage
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return super.tokenURI(tokenId);
    }
}


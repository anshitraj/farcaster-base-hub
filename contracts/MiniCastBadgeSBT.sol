// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MiniCastBadgeSBT
 * @notice Soulbound ERC721 badge contract for MiniCast Store
 * @dev ERC721 compatible SBT - BaseScan will display as NFT, but transfers are blocked
 */
contract MiniCastBadgeSBT is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    // wallet => list of tokenIds (kept for backward compatibility)
    mapping(address => uint256[]) public tokensOf;

    // wallet => appId => claimed?
    mapping(address => mapping(uint256 => bool)) public hasClaimed;

    // tokenId => appId
    mapping(uint256 => uint256) public badgeApp;

    // metadata URI (same for all tokens)
    string public baseBadgeURI;

    // Events for better tracking
    event BadgeMinted(address indexed to, uint256 indexed tokenId, uint256 indexed appId);
    event ClaimReset(address indexed wallet, uint256 indexed appId);

    constructor(string memory _badgeURI)
        ERC721("MiniCast Store Badge", "MCB")
        Ownable(msg.sender)
    {
        baseBadgeURI = _badgeURI;
    }

    /**
     * @notice Mint a badge to an address for a specific appId
     * @param to Address to mint badge to
     * @param appId App ID (uint256)
     * @return tokenId The token ID of the minted badge
     */
    function mintBadge(address to, uint256 appId) external onlyOwner returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(!hasClaimed[to][appId], "Badge already claimed for this app");

        // Double-check: verify user doesn't already own a token for this appId
        // This prevents state corruption
        uint256[] memory tokens = tokensOf[to];
        for (uint256 i = 0; i < tokens.length; i++) {
            require(badgeApp[tokens[i]] != appId, "User already owns badge for this app");
        }

        uint256 tokenId = _tokenIdCounter++;
        
        // Use _safeMint() - REQUIRED for BaseScan to show NFT
        // This emits standard Transfer(0x0 → to) event that BaseScan needs
        _safeMint(to, tokenId);
        
        // Keep our custom mappings for backward compatibility
        tokensOf[to].push(tokenId);
        badgeApp[tokenId] = appId;
        hasClaimed[to][appId] = true;

        emit BadgeMinted(to, tokenId, appId);
        return tokenId;
    }

    /**
     * @notice Metadata URI for all tokens
     * @param tokenId Token ID (unused, all tokens use same URI)
     * @return The base badge URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId); // Ensure token exists
        return baseBadgeURI;
    }

    /**
     * @notice Update the badge URI
     * @param newURI New base URI for badges
     */
    function setBaseURI(string memory newURI) external onlyOwner {
        baseBadgeURI = newURI;
    }

    /**
     * @notice Reset claim if token doesn't exist but hasClaimed=true
     * @param wallet Wallet address to reset
     * @param appId App ID to reset
     */
    function resetClaim(address wallet, uint256 appId) external onlyOwner {
        require(wallet != address(0), "Invalid wallet address");

        // Verify user doesn't actually own a token for this appId
        uint256[] memory tokens = tokensOf[wallet];
        for (uint256 i = 0; i < tokens.length; i++) {
            require(badgeApp[tokens[i]] != appId, "User owns token, cannot reset");
        }

        // Only reset if currently set to true
        if (hasClaimed[wallet][appId]) {
            hasClaimed[wallet][appId] = false;
            emit ClaimReset(wallet, appId);
        }
    }

    /**
     * @notice Batch reset multiple claims
     * @param wallets Array of wallet addresses
     * @param appIds Array of app IDs (must match wallets length)
     */
    function batchResetClaims(address[] calldata wallets, uint256[] calldata appIds) external onlyOwner {
        require(wallets.length == appIds.length, "Arrays length mismatch");

        for (uint256 i = 0; i < wallets.length; i++) {
            address wallet = wallets[i];
            uint256 appId = appIds[i];

            if (wallet == address(0)) continue;

            // Verify user doesn't own token
            bool ownsToken = false;
            uint256[] memory tokens = tokensOf[wallet];
            for (uint256 j = 0; j < tokens.length; j++) {
                if (badgeApp[tokens[j]] == appId) {
                    ownsToken = true;
                    break;
                }
            }

            // Only reset if user doesn't own token and hasClaimed is true
            if (!ownsToken && hasClaimed[wallet][appId]) {
                hasClaimed[wallet][appId] = false;
                emit ClaimReset(wallet, appId);
            }
        }
    }

    /**
     * @notice Get total number of tokens minted
     * @return Total supply
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @notice Check if a wallet owns a token for a specific appId
     * @param wallet Wallet address to check
     * @param appId App ID to check
     * @return True if wallet owns a token for this appId
     */
    function ownsTokenForApp(address wallet, uint256 appId) external view returns (bool) {
        uint256[] memory tokens = tokensOf[wallet];
        for (uint256 i = 0; i < tokens.length; i++) {
            if (badgeApp[tokens[i]] == appId) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Prevent all transfers (SBT behavior)
     * @dev Override ERC721 _update to block transfers while allowing mint/burn
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        // Allow mint (from zero) and burn (to zero)
        // Block all transfers between non-zero addresses
        address from = _ownerOf(tokenId);
        require(
            from == address(0) || to == address(0),
            "SBT: transfers disabled"
        );
        return super._update(to, tokenId, auth);
    }

    // Disable approvals (SBT behavior)
    function approve(address, uint256) public pure override {
        revert("SBT: no approvals");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert("SBT: no approvals");
    }

    function getApproved(uint256) public pure override returns (address) {
        return address(0);
    }

    function isApprovedForAll(address, address) public pure override returns (bool) {
        return false;
    }
}

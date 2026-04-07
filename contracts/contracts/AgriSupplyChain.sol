// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgriSupplyChain
 * @author AgriSupplyChain Team
 * @notice Agriculture Supply Chain Management with on-chain User Management and Batch Creation.
 *         Designed for Ethereum / Polygon. College project friendly.
 *
 * ROLES: Owner (0), Farmer (1), Distributor (2), Retailer (3), Consumer (4)
 * - Owner: register & verify users (KYC, verification)
 * - Farmer: create batches only
 * - Anyone: view all batches
 */
contract AgriSupplyChain {

    // -------------------------
    // ROLES (ENUM)
    // -------------------------
    enum Role {
        Owner,      // 0 – contract owner, can register/verify users
        Farmer,     // 1 – can create batches
        Distributor,// 2
        Retailer,   // 3
        Consumer    // 4
    }

    // -------------------------
    // USER STRUCT
    // -------------------------
    struct User {
        string name;
        string email;
        Role role;
        bool kycVerified;
        bool isVerified;
        address wallet;
    }

    // -------------------------
    // BATCH STRUCT
    // -------------------------
    struct Batch {
        uint256 batchId;
        string cropName;
        uint256 quantity;
        string location;
        address farmer;
        string farmerName;
        string status;
        uint256 createdAt;
    }

    // -------------------------
    // STATE VARIABLES
    // -------------------------
    address public owner;

    mapping(address => User) public users;
    address[] public userList;

    mapping(uint256 => Batch) public batches;
    uint256[] public batchIds;
    uint256 public batchCounter;

    // -------------------------
    // EVENTS
    // -------------------------
    event UserRegistered(address indexed wallet, Role role);
    event UserVerified(address indexed wallet);
    event BatchCreated(uint256 indexed batchId, address indexed farmer);

    // -------------------------
    // MODIFIERS
    // -------------------------
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /// @dev Only a registered user with role Farmer can create batches
    modifier onlyFarmer() {
        require(users[msg.sender].wallet == msg.sender, "User not registered");
        require(users[msg.sender].role == Role.Farmer, "Only Farmer can create batch");
        _;
    }

    // -------------------------
    // CONSTRUCTOR + SEED DATA
    // -------------------------
    constructor() {
        owner = msg.sender;

        // ---- Seed 15 demo users (addresses 1..15) ----
        _registerUserInternal(address(0x1), "Ramesh Kumar", "ramesh@demo.com", Role.Farmer);
        _registerUserInternal(address(0x2), "Suresh Patel", "suresh@demo.com", Role.Farmer);
        _registerUserInternal(address(0x3), "Amit Singh", "amit@demo.com", Role.Farmer);
        _registerUserInternal(address(0x4), "Neha Sharma", "neha@demo.com", Role.Distributor);
        _registerUserInternal(address(0x5), "Rahul Mehta", "rahul@demo.com", Role.Distributor);
        _registerUserInternal(address(0x6), "Anita Gupta", "anita@demo.com", Role.Retailer);
        _registerUserInternal(address(0x7), "Vikram Rao", "vikram@demo.com", Role.Retailer);
        _registerUserInternal(address(0x8), "Pooja Verma", "pooja@demo.com", Role.Consumer);
        _registerUserInternal(address(0x9), "Deepak Yadav", "deepak@demo.com", Role.Consumer);
        _registerUserInternal(address(0xA), "Kavita Nair", "kavita@demo.com", Role.Farmer);
        _registerUserInternal(address(0xB), "Sanjay Mishra", "sanjay@demo.com", Role.Distributor);
        _registerUserInternal(address(0xC), "Priya Kapoor", "priya@demo.com", Role.Retailer);
        _registerUserInternal(address(0xD), "Nikhil Jain", "nikhil@demo.com", Role.Consumer);
        _registerUserInternal(address(0xE), "Meera Singh", "meera@demo.com", Role.Farmer);
        _registerUserInternal(address(0xF), "Arjun Khanna", "arjun@demo.com", Role.Distributor);

        // Verify a few for demo
        users[address(0x1)].kycVerified = true;
        users[address(0x1)].isVerified = true;
        users[address(0x2)].kycVerified = true;
        users[address(0x2)].isVerified = true;
        users[address(0x4)].kycVerified = true;
        users[address(0x4)].isVerified = true;

        // ---- Seed 3 demo batches (from farmers 0x1, 0x2, 0x3) ----
        batchCounter = 1;
        _createBatchInternal(1, "Wheat", 500, "Agra, UP", address(0x1), "Ramesh Kumar");
        batchCounter = 2;
        _createBatchInternal(2, "Rice", 800, "Indore, MP", address(0x2), "Suresh Patel");
        batchCounter = 3;
        _createBatchInternal(3, "Potato", 1200, "Meerut, UP", address(0x3), "Amit Singh");
    }

    function _registerUserInternal(
        address wallet,
        string memory name,
        string memory email,
        Role role
    ) internal {
        require(users[wallet].wallet == address(0), "User already exists");
        users[wallet] = User({
            name: name,
            email: email,
            role: role,
            kycVerified: false,
            isVerified: false,
            wallet: wallet
        });
        userList.push(wallet);
        emit UserRegistered(wallet, role);
    }

    function _createBatchInternal(
        uint256 id,
        string memory cropName,
        uint256 quantity,
        string memory location,
        address farmerAddr,
        string memory farmerName
    ) internal {
        batches[id] = Batch({
            batchId: id,
            cropName: cropName,
            quantity: quantity,
            location: location,
            farmer: farmerAddr,
            farmerName: farmerName,
            status: "Created",
            createdAt: block.timestamp
        });
        batchIds.push(id);
        emit BatchCreated(id, farmerAddr);
    }

    // -------------------------
    // 1. registerUser – Only Owner
    // -------------------------
    /// @param wallet User's wallet address
    /// @param name Full name
    /// @param email Email
    /// @param role Role enum (0=Owner, 1=Farmer, 2=Distributor, 3=Retailer, 4=Consumer)
    function registerUser(
        address wallet,
        string calldata name,
        string calldata email,
        Role role
    ) external onlyOwner {
        require(wallet != address(0), "Invalid wallet");
        require(users[wallet].wallet == address(0), "User already registered");
        users[wallet] = User({
            name: name,
            email: email,
            role: role,
            kycVerified: false,
            isVerified: false,
            wallet: wallet
        });
        userList.push(wallet);
        emit UserRegistered(wallet, role);
    }

    // -------------------------
    // 2. verifyKYC – Only Owner
    // -------------------------
    function verifyKYC(address wallet) external onlyOwner {
        require(users[wallet].wallet != address(0), "User not registered");
        users[wallet].kycVerified = true;
        emit UserVerified(wallet);
    }

    // -------------------------
    // 3. verifyUser – Only Owner
    // -------------------------
    function verifyUser(address wallet) external onlyOwner {
        require(users[wallet].wallet != address(0), "User not registered");
        users[wallet].isVerified = true;
        emit UserVerified(wallet);
    }

    // -------------------------
    // 4. createBatch – Only Farmer
    // -------------------------
    /// @param cropName e.g. "Wheat"
    /// @param quantity e.g. 500 (kg or units)
    /// @param location e.g. "Agra, UP"
    function createBatch(
        string calldata cropName,
        uint256 quantity,
        string calldata location
    ) external onlyFarmer {
        require(quantity > 0, "Quantity must be > 0");
        batchCounter++;
        uint256 id = batchCounter;
        User storage u = users[msg.sender];
        batches[id] = Batch({
            batchId: id,
            cropName: cropName,
            quantity: quantity,
            location: location,
            farmer: msg.sender,
            farmerName: u.name,
            status: "Created",
            createdAt: block.timestamp
        });
        batchIds.push(id);
        emit BatchCreated(id, msg.sender);
    }

    // -------------------------
    // 5. getAllUsers – View
    // -------------------------
    /// @return Array of User structs (name, email, role, kycVerified, isVerified, wallet)
    function getAllUsers() external view returns (User[] memory) {
        uint256 len = userList.length;
        User[] memory list = new User[](len);
        for (uint256 i = 0; i < len; i++) {
            list[i] = users[userList[i]];
        }
        return list;
    }

    // -------------------------
    // 6. getAllBatches – View
    // -------------------------
    /// @return Array of Batch structs
    function getAllBatches() external view returns (Batch[] memory) {
        uint256 len = batchIds.length;
        Batch[] memory list = new Batch[](len);
        for (uint256 i = 0; i < len; i++) {
            list[i] = batches[batchIds[i]];
        }
        return list;
    }

    // -------------------------
    // 7. getMyBatches – View (farmer's batches only)
    // -------------------------
    /// @param farmer Address of the farmer
    /// @return Array of Batch structs for that farmer
    function getMyBatches(address farmer) external view returns (Batch[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < batchIds.length; i++) {
            if (batches[batchIds[i]].farmer == farmer) count++;
        }
        Batch[] memory list = new Batch[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < batchIds.length; i++) {
            Batch storage b = batches[batchIds[i]];
            if (b.farmer == farmer) {
                list[j] = b;
                j++;
            }
        }
        return list;
    }

    /// @dev Helper: get user by address (convenience view)
    function getUser(address wallet) external view returns (User memory) {
        return users[wallet];
    }

    /// @dev Helper: get batch by id
    function getBatch(uint256 batchId) external view returns (Batch memory) {
        require(batches[batchId].createdAt > 0, "Batch does not exist");
        return batches[batchId];
    }
}

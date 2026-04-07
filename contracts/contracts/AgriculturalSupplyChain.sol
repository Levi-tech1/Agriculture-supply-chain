// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgriculturalSupplyChain
 * @dev End-to-end tracking of crops from farmers to markets on an immutable ledger.
 * Stages: Farmer Registration -> Crop Production -> Quality Inspection -> Storage -> Transportation -> Market Sale
 */
contract AgriculturalSupplyChain {
    enum Role { None, Farmer, Buyer, Distributor, Retailer, Inspector }
    enum BatchStage {
        Created,           // 0 - Crop registered
        QualityChecked,    // 1 - Passed inspection
        InStorage,        // 2 - At storage facility
        InTransit,        // 3 - During transport
        Delivered,        // 4 - Reached market
        Sold              // 5 - Sold to consumer
    }

    struct Actor {
        address wallet;
        Role role;
        string name;
        string location;
        bool registered;
    }

    struct CropBatch {
        bytes32 batchId;
        address farmerAddress;
        string cropType;
        uint256 quantityKg;
        uint256 harvestDate;      // timestamp
        string farmLocation;
        bytes32 metadataHash;     // hash of metadata stored off-chain (IPFS or database)
        BatchStage stage;
        address currentHolder;    // who has custody now
        address buyerAddress;     // final buyer (set on sale)
        uint256 priceWei;         // agreed price for payment on delivery
        bool paymentReleased;
        uint256 createdAt;
    }

    struct TransferRecord {
        address from;
        address to;
        string location;
        uint256 timestamp;
        BatchStage stageAtTransfer;
    }

    mapping(address => Actor) public actors;
    mapping(bytes32 => CropBatch) public batches;
    
    // Event for batch creation with metadata hash
    event BatchCreatedWithMetadata(bytes32 indexed batchId, address indexed farmer, bytes32 metadataHash);
    mapping(bytes32 => TransferRecord[]) public batchTransfers;
    mapping(bytes32 => address) public batchInspector;  // who approved quality

    address public owner;
    uint256 public batchCounter;

    event ActorRegistered(address indexed wallet, Role role, string name, string location);
    event BatchCreated(bytes32 indexed batchId, address indexed farmer, string cropType, uint256 quantityKg, uint256 harvestDate, string farmLocation);
    event QualityApproved(bytes32 indexed batchId, address indexed inspector);
    event BatchStored(bytes32 indexed batchId, address indexed facility, string location);
    event BatchInTransit(bytes32 indexed batchId, address indexed transporter, string location);
    event BatchDelivered(bytes32 indexed batchId, address indexed recipient);
    event BatchSold(bytes32 indexed batchId, address indexed buyer, uint256 priceWei);
    event PaymentReleased(bytes32 indexed batchId, address indexed farmer, uint256 amountWei);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyRegistered() {
        require(actors[msg.sender].registered, "Not registered");
        _;
    }

    modifier onlyRole(Role r) {
        require(actors[msg.sender].role == r, "Wrong role");
        _;
    }

    modifier batchExists(bytes32 batchId) {
        require(batches[batchId].createdAt > 0, "Batch does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function register(
        Role role,
        string calldata name,
        string calldata location
    ) external {
        require(role != Role.None && role != Role.Inspector, "Invalid role for self-register");
        require(!actors[msg.sender].registered, "Already registered");
        actors[msg.sender] = Actor({
            wallet: msg.sender,
            role: role,
            name: name,
            location: location,
            registered: true
        });
        emit ActorRegistered(msg.sender, role, name, location);
    }

    function registerInspector(address wallet, string calldata name, string calldata location) external onlyOwner {
        require(!actors[wallet].registered, "Already registered");
        actors[wallet] = Actor({
            wallet: wallet,
            role: Role.Inspector,
            name: name,
            location: location,
            registered: true
        });
        emit ActorRegistered(wallet, Role.Inspector, name, location);
    }

    function createBatch(
        string calldata cropType,
        uint256 quantityKg,
        uint256 harvestDate,
        string calldata farmLocation
    ) external onlyRegistered onlyRole(Role.Farmer) returns (bytes32) {
        return createBatchWithMetadata(cropType, quantityKg, harvestDate, farmLocation, bytes32(0));
    }

    function createBatchWithMetadata(
        string calldata cropType,
        uint256 quantityKg,
        uint256 harvestDate,
        string calldata farmLocation,
        bytes32 metadataHash
    ) public onlyRegistered onlyRole(Role.Farmer) returns (bytes32) {
        require(quantityKg > 0 && harvestDate <= block.timestamp, "Invalid batch data");
        batchCounter++;
        bytes32 batchId = keccak256(abi.encodePacked(block.timestamp, msg.sender, batchCounter));
        batches[batchId] = CropBatch({
            batchId: batchId,
            farmerAddress: msg.sender,
            cropType: cropType,
            quantityKg: quantityKg,
            harvestDate: harvestDate,
            farmLocation: farmLocation,
            metadataHash: metadataHash,
            stage: BatchStage.Created,
            currentHolder: msg.sender,
            buyerAddress: address(0),
            priceWei: 0,
            paymentReleased: false,
            createdAt: block.timestamp
        });
        _addTransfer(batchId, address(0), msg.sender, farmLocation, BatchStage.Created);
        emit BatchCreated(batchId, msg.sender, cropType, quantityKg, harvestDate, farmLocation);
        if (metadataHash != bytes32(0)) {
            emit BatchCreatedWithMetadata(batchId, msg.sender, metadataHash);
        }
        return batchId;
    }

    function approveQuality(bytes32 batchId) external onlyRegistered onlyRole(Role.Inspector) batchExists(batchId) {
        CropBatch storage b = batches[batchId];
        require(b.stage == BatchStage.Created, "Already inspected or moved");
        b.stage = BatchStage.QualityChecked;
        batchInspector[batchId] = msg.sender;
        _addTransfer(batchId, b.currentHolder, msg.sender, "Quality inspection", BatchStage.QualityChecked);
        b.currentHolder = msg.sender;
        emit QualityApproved(batchId, msg.sender);
    }

    function moveToStorage(bytes32 batchId, string calldata location) external onlyRegistered batchExists(batchId) {
        CropBatch storage b = batches[batchId];
        require(b.stage == BatchStage.QualityChecked, "Must be quality checked first");
        require(
            actors[msg.sender].role == Role.Distributor || actors[msg.sender].role == Role.Inspector,
            "Only distributor or inspector"
        );
        _addTransfer(batchId, b.currentHolder, msg.sender, location, BatchStage.InStorage);
        b.currentHolder = msg.sender;
        b.stage = BatchStage.InStorage;
        emit BatchStored(batchId, msg.sender, location);
    }

    function startTransport(bytes32 batchId, string calldata location) external onlyRegistered batchExists(batchId) {
        CropBatch storage b = batches[batchId];
        require(b.stage == BatchStage.InStorage, "Must be in storage first");
        require(actors[msg.sender].role == Role.Distributor, "Only distributor");
        _addTransfer(batchId, b.currentHolder, msg.sender, location, BatchStage.InTransit);
        b.currentHolder = msg.sender;
        b.stage = BatchStage.InTransit;
        emit BatchInTransit(batchId, msg.sender, location);
    }

    function confirmDelivery(bytes32 batchId, address recipient) external onlyRegistered batchExists(batchId) {
        CropBatch storage b = batches[batchId];
        require(b.stage == BatchStage.InTransit, "Must be in transit");
        require(actors[msg.sender].role == Role.Distributor, "Only distributor");
        require(actors[recipient].registered, "Recipient must be registered");
        _addTransfer(batchId, b.currentHolder, recipient, "Delivery", BatchStage.Delivered);
        b.currentHolder = recipient;
        b.stage = BatchStage.Delivered;
        emit BatchDelivered(batchId, recipient);
    }

    function listForSale(bytes32 batchId, uint256 priceWei) external onlyRegistered batchExists(batchId) {
        CropBatch storage b = batches[batchId];
        require(b.stage == BatchStage.Delivered, "Must be delivered first");
        require(b.currentHolder == msg.sender, "Only current holder");
        require(actors[msg.sender].role == Role.Retailer, "Only retailer can list");
        b.priceWei = priceWei;
    }

    function buyBatch(bytes32 batchId) external payable onlyRegistered onlyRole(Role.Buyer) batchExists(batchId) {
        CropBatch storage b = batches[batchId];
        require(b.stage == BatchStage.Delivered, "Must be delivered and listed");
        require(b.priceWei > 0 && msg.value >= b.priceWei, "Insufficient payment");
        _addTransfer(batchId, b.currentHolder, msg.sender, "Market sale", BatchStage.Sold);
        b.currentHolder = msg.sender;
        b.buyerAddress = msg.sender;
        b.stage = BatchStage.Sold;
        emit BatchSold(batchId, msg.sender, b.priceWei);
    }

    function releasePaymentToFarmer(bytes32 batchId) external onlyRegistered batchExists(batchId) {
        CropBatch storage b = batches[batchId];
        require(b.stage == BatchStage.Sold, "Batch must be sold first");
        require(!b.paymentReleased, "Payment already released");
        require(
            msg.sender == b.buyerAddress || msg.sender == owner,
            "Only buyer or owner can release"
        );
        b.paymentReleased = true;
        (bool ok,) = payable(b.farmerAddress).call{ value: b.priceWei }("");
        require(ok, "Transfer failed");
        emit PaymentReleased(batchId, b.farmerAddress, b.priceWei);
    }

    function _addTransfer(bytes32 batchId, address from, address to, string memory location, BatchStage stage) internal {
        batchTransfers[batchId].push(TransferRecord({
            from: from,
            to: to,
            location: location,
            timestamp: block.timestamp,
            stageAtTransfer: stage
        }));
    }

    function getBatch(bytes32 batchId) external view returns (
        bytes32 id,
        address farmerAddress,
        string memory cropType,
        uint256 quantityKg,
        uint256 harvestDate,
        string memory farmLocation,
        bytes32 metadataHash,
        BatchStage stage,
        address currentHolder,
        address buyerAddress,
        uint256 priceWei,
        bool paymentReleased,
        uint256 createdAt
    ) {
        CropBatch storage b = batches[batchId];
        require(b.createdAt > 0, "Batch does not exist");
        return (
            b.batchId,
            b.farmerAddress,
            b.cropType,
            b.quantityKg,
            b.harvestDate,
            b.farmLocation,
            b.metadataHash,
            b.stage,
            b.currentHolder,
            b.buyerAddress,
            b.priceWei,
            b.paymentReleased,
            b.createdAt
        );
    }

    function getTransferCount(bytes32 batchId) external view returns (uint256) {
        return batchTransfers[batchId].length;
    }

    function getTransfer(bytes32 batchId, uint256 index) external view returns (
        address from,
        address to,
        string memory location,
        uint256 timestamp,
        BatchStage stageAtTransfer
    ) {
        TransferRecord storage t = batchTransfers[batchId][index];
        return (t.from, t.to, t.location, t.timestamp, t.stageAtTransfer);
    }

    function getActor(address wallet) external view returns (Role role, string memory name, string memory location, bool registered) {
        Actor storage a = actors[wallet];
        return (a.role, a.name, a.location, a.registered);
    }
}

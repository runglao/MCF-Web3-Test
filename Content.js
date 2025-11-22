 // ============================================
        // 1. CONFIGURATION
        // ============================================
        
        // ВАЖНО: Вставь сюда ссылки на свои картинки для 8 NFT
        const nftImages = [
            "https://olive-random-anteater-963.mypinata.cloud/ipfs/bafkreicwkh3wdpe4bec5aimnjirtp73sjfadkuwe3sikyatatguxbvfbp4", // 1
            "https://olive-random-anteater-963.mypinata.cloud/ipfs/bafkreiacnj5vbnw32n2legauzdmlrn5377ifl5ozixp2em6uka5syfa5qe", // 2
            "https://olive-random-anteater-963.mypinata.cloud/ipfs/bafkreiepkz7zfeyrb6u4u7pg7obechyrqei7l6iy7wc2fdfjm3ims6l2se", // 3
            "https://olive-random-anteater-963.mypinata.cloud/ipfs/bafkreifnzbz6pr7wy7klmb5tknqi6mnfuh2bxdiy73t2llowdykdxu3boa", // 4
            "https://olive-random-anteater-963.mypinata.cloud/ipfs/bafkreiaz2w5z7cjbz2ggcgfwovdhpimbipuueffemkw73wq3i7lk5uzifm", // 5
            "https://olive-random-anteater-963.mypinata.cloud/ipfs/bafkreigkk4y57l7s4fsts5wsjjaqtoi362nmwqhassptuu4k46o3rpdvum", // 6
            "https://olive-random-anteater-963.mypinata.cloud/ipfs/bafkreigdctqvwaosav37brqwxnglfrnie7puthgfsvvxmroybnqov4aayu", // 7
            "https://olive-random-anteater-963.mypinata.cloud/ipfs/bafkreiaxboy632fm55nwaeg322d2qsdadzcg6gzhfcntktpdpab6nbmzdi"  // 8
        ];

        const MCF_ADDRESS = "0xb66008C221CE3699c7F50AebB07898695845e95f";
        const NFT_ADDRESS = "0xda2384357a072818a7c1BC4Bbd79Edf22065c95A";
        const EXPLORER_URL = "https://sepolia.etherscan.io/tx/";

        const MCF_ABI = [
            {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"payable","type":"function"},
            {"inputs":[],"name":"MAX_SUPPLY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
            {"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
            {"inputs":[],"name":"mintPrice","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
            {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
            {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
            {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
             {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
        ];

        const NFT_ABI = [
            {"inputs":[{"internalType":"uint256","name":"editionId","type":"uint256"}],"name":"mintByMCF","outputs":[],"stateMutability":"nonpayable","type":"function"},
            {"inputs":[{"internalType":"address","name":"_addr","type":"address"},{"internalType":"uint256","name":"editionId","type":"uint256"}],"name":"hasEditionMinted","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}
        ];

        // ============================================
        // 2. STATE & UI REFS
        // ============================================

        let provider, signer;
        let mcfContract, nftContract;
        let userAccount, isConnected = false;
        
        let contractState = {
            maxSupply: 0,
            totalSupply: 0,
            mintPriceWei: ethers.BigNumber.from("0"),
            tokensPerEth: 0
        };

        const NFT_PRICE_MCF = 10000; // 10k MCF

        // UI
        const connectBtn = document.getElementById('connectBtn');
        const mintInput = document.getElementById('mintAmountEth');
        const modal = document.getElementById('txModal');
        const mLink = document.getElementById('modalLinkContainer');
        const nftGrid = document.getElementById('nftGrid');

        // Calculator
        mintInput.addEventListener('input', (e) => {
            const ethVal = parseFloat(e.target.value) || 0;
            if (contractState.tokensPerEth > 0) {
                const estimatedTokens = ethVal * contractState.tokensPerEth;
                document.getElementById('calcOutput').innerText = estimatedTokens.toLocaleString() + " MCF";
            }
        });

        // ============================================
        // 3. INITIALIZATION & CONNECTION
        // ============================================

        // Initialize NFT Grid on Load
        renderNFTGrid();

        function renderNFTGrid() {
            nftGrid.innerHTML = '';
            for(let i = 1; i <= 8; i++) {
                const img = nftImages[i-1] || "https://via.placeholder.com/300/0a1f16/00ff88?text=NFT";
                const html = `
                    <div class="nft-card" id="card-${i}">
                        <div class="nft-image-container">
                            <img src="${img}" class="nft-image" alt="NFT ${i}">
                        </div>
                        <div class="nft-title">Edition #${i}</div>
                        <div class="nft-price">Price: 10,000 MCF</div>
                        <button class="btn-mint-nft" id="btn-nft-${i}" onclick="mintNFT(${i})" disabled>Connect Wallet</button>
                    </div>
                `;
                nftGrid.insertAdjacentHTML('beforeend', html);
            }
        }

        async function toggleConnection() {
            if(isConnected) disconnect(); else connect();
        }

        async function connect() {
            if (!window.ethereum) return alert("Install MetaMask");
            try {
                provider = new ethers.providers.Web3Provider(window.ethereum);
                await provider.send("eth_requestAccounts", []);
                signer = provider.getSigner();
                userAccount = await signer.getAddress();
                
                // Init Contracts
                mcfContract = new ethers.Contract(MCF_ADDRESS, MCF_ABI, signer);
                nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);
                
                isConnected = true;
                updateUI();
                await fetchContractData(); // MCF Token Data
                await checkNFTStatus();    // Check which NFTs are owned

                window.ethereum.on('accountsChanged', (accs) => {
                    if(accs.length === 0) disconnect(); else { userAccount = accs[0]; updateUI(); fetchContractData(); checkNFTStatus(); }
                });
            } catch (err) { console.error(err); alert("Connect Error: " + err.message); }
        }

        function disconnect() {
            userAccount = null; signer = null; mcfContract = null; nftContract = null; isConnected = false;
            connectBtn.innerText = "CONNECT";
            connectBtn.classList.remove("connected");
            document.getElementById('mintBtn').innerText = "CONNECT WALLET";
            document.getElementById('mintBtn').disabled = true;
            document.getElementById('networkDisplay').style.display = 'none';
            document.getElementById('balanceDisplay').style.display = 'none';
            
            // Reset NFT Buttons
            document.querySelectorAll('.btn-mint-nft').forEach(btn => {
                btn.innerText = "Connect Wallet";
                btn.disabled = true;
                btn.classList.remove('minted');
            });
        }

        async function updateUI() {
            connectBtn.innerText = `DISCONNECT`;
            connectBtn.classList.add("connected");
            const bal = await provider.getBalance(userAccount);
            document.getElementById('balanceDisplay').innerText = parseFloat(ethers.utils.formatEther(bal)).toFixed(4) + " ETH";
            document.getElementById('balanceDisplay').style.display = "block";
            const net = await provider.getNetwork();
            document.getElementById('networkDisplay').innerText = "ID: " + net.chainId;
            document.getElementById('networkDisplay').style.display = "block";
            
            document.getElementById('mintBtn').innerText = "BUY TOKENS";
            document.getElementById('mintBtn').disabled = false;
        }

        // ============================================
        // 4. LOGIC: MCF TOKEN
        // ============================================

        async function fetchContractData() {
            if (!mcfContract) return;
            try {
                const maxRaw = await mcfContract.MAX_SUPPLY();
                const totalRaw = await mcfContract.totalSupply();
                const priceRaw = await mcfContract.mintPrice();

                contractState.maxSupply = parseFloat(ethers.utils.formatEther(maxRaw));
                contractState.totalSupply = parseFloat(ethers.utils.formatEther(totalRaw));
                contractState.mintPriceWei = priceRaw;

                const ethOne = ethers.utils.parseEther("1");
                if (priceRaw.gt(0)) {
                    contractState.tokensPerEth = ethOne.div(priceRaw).toNumber();
                }

                const remaining = contractState.maxSupply - contractState.totalSupply;
                document.getElementById('remainingDisplay').innerText = remaining.toLocaleString();
                document.getElementById('priceDisplay').innerText = ethers.utils.formatEther(priceRaw) + " ETH";
                
                const percent = (contractState.totalSupply / contractState.maxSupply) * 100;
                document.getElementById('supplyBar').style.width = percent + "%";
                document.getElementById('progressText').innerText = `${contractState.totalSupply.toLocaleString()} / ${contractState.maxSupply.toLocaleString()} SOLD`;

            } catch (e) { console.error(e); }
        }

        async function mintToken() {
            if (!isConnected) return alert("Connect Wallet!");
            const rawEthAmount = mintInput.value;
            if (!rawEthAmount || parseFloat(rawEthAmount) <= 0) return alert("Enter valid ETH amount");
            document.getElementById('mintError').style.display = 'none';

            openModal('loading', "Confirm transaction...");
            try {
                const ethValue = ethers.utils.parseEther(rawEthAmount.toString());
                const amountTokensBN = ethValue.div(contractState.mintPriceWei);
                
                const tx = await mcfContract.mint(amountTokensBN, { value: ethValue });
                openModal('loading', "Transaction sent...");
                showTxLink(tx.hash);
                await tx.wait();
                openModal('success');
                showTxLink(tx.hash);
                fetchContractData();
            } catch (err) {
                console.error(err);
                let msg = err.reason || err.message;
                if (msg.includes("Max supply")) msg = "SOLD OUT or Amount too high!";
                openModal('error', msg);
            }
        }

        async function transferToken() {
            if (!isConnected) return alert("Connect Wallet!");
            const to = document.getElementById('recipientAddress').value;
            const amount = document.getElementById('sendAmount').value;
            if (!ethers.utils.isAddress(to) || !amount) return alert("Invalid Input");

            openModal('loading', "Transferring...");
            try {
                const val = ethers.utils.parseEther(amount.toString());
                const tx = await mcfContract.transfer(to, val);
                showTxLink(tx.hash);
                await tx.wait();
                openModal('success');
                showTxLink(tx.hash);
            } catch (err) { openModal('error', err.reason || err.message); }
        }

        // ============================================
        // 5. LOGIC: NFT MINTING (NEW!)
        // ============================================

        async function checkNFTStatus() {
            if(!nftContract) return;
            // Пробегаем по всем 8 изданиям
            for (let i = 1; i <= 8; i++) {
                const btn = document.getElementById(`btn-nft-${i}`);
                try {
                    // Проверяем, минтил ли этот адрес эту серию
                    const isMinted = await nftContract.hasEditionMinted(userAccount, i);
                    
                    if (isMinted) {
                        btn.innerText = "ALREADY MINTED";
                        btn.disabled = true;
                        btn.classList.add('minted');
                    } else {
                        btn.innerText = "MINT FOR 10k MCF";
                        btn.disabled = false;
                        btn.classList.remove('minted');
                    }
                } catch (e) {
                    console.log(`Error checking edition ${i}`, e);
                }
            }
        }

        async function mintNFT(editionId) {
            if (!isConnected) return alert("Connect Wallet!");

            openModal('loading', "Checking Balance & Allowance...");

            try {
                // 1. Check MCF Balance
                const mcfBalance = await mcfContract.balanceOf(userAccount);
                const priceInWei = ethers.utils.parseEther(NFT_PRICE_MCF.toString()); // 10000 * 10^18

                if (mcfBalance.lt(priceInWei)) {
                    throw new Error("Insufficient MCF Balance! You need 10,000 MCF.");
                }

                // 2. Check Allowance (Разрешено ли контракту NFT брать твои MCF?)
                const allowance = await mcfContract.allowance(userAccount, NFT_ADDRESS);

                if (allowance.lt(priceInWei)) {
                    // 3. NEED APPROVE
                    openModal('loading', `Step 1/2: Approve MCF usage...`);
                    const approveTx = await mcfContract.approve(NFT_ADDRESS, priceInWei);
                    showTxLink(approveTx.hash);
                    await approveTx.wait();
                }

                // 4. MINT
                openModal('loading', `Step 2/2: Minting NFT Edition #${editionId}...`);
                const mintTx = await nftContract.mintByMCF(editionId);
                showTxLink(mintTx.hash);
                
                await mintTx.wait();

                openModal('success', `NFT Edition #${editionId} Minted!`);
                showTxLink(mintTx.hash);
                
                // Обновить статус кнопок
                checkNFTStatus();
                // Обновить баланс токенов (так как они списались)
                fetchContractData();

            } catch (err) {
                console.error(err);
                openModal('error', err.reason || err.message);
            }
        }

        // ============================================
        // 6. UTILS
        // ============================================

        function openModal(type, text = "") {
            modal.style.display = 'flex'; mLink.innerHTML = "";
            const title = document.getElementById('modalTitle');
            const desc = document.getElementById('modalDesc');
            const icon = document.getElementById('modalIcon');
            
            if (type === 'loading') {
                icon.innerHTML = '<div class="spinner"></div>';
                title.innerText = "Processing..."; title.style.color = "#fff";
                desc.innerText = text;
            } else if (type === 'success') {
                icon.innerHTML = '✅';
                title.innerText = "Success!"; title.style.color = "#00ff88";
                desc.innerText = text || "Confirmed!";
            } else if (type === 'error') {
                icon.innerHTML = '❌';
                title.innerText = "Failed"; title.style.color = "#ef4444";
                desc.innerText = text;
            }
        }
        function showTxLink(hash) { mLink.innerHTML = `<a href="${EXPLORER_URL}${hash}" target="_blank" class="tx-hash-link">View on Etherscan ↗</a>`; }
        function closeModal() { modal.style.display = 'none'; }

        connectBtn.addEventListener('click', toggleConnection);
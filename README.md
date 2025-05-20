![github-submission-banner](https://github.com/user-attachments/assets/a1493b84-e4e2-456e-a791-ce35ee2bcf2f)

# 🚀 PersonaRewards: Earn Rewards for Your Web Data

> A blockchain-based browser extension that rewards users for sharing browsing data and completing targeted surveys.

---

## 📌 Problem Statement

**Problem Statement 12 – Reimagining Digital Advertising Value**

---

## 🎯 Objective

PersonaRewards addresses the imbalance in digital advertising by rewarding users directly for their attention and data. While advertisers spend billions annually on digital ads, users rarely see any direct benefit despite being the core asset. Our browser extension analyzes web content to build user interest profiles (with full user control) and rewards users with tokens and NFT badges for completing surveys and quests tailored to their interests.

This creates a more equitable and transparent value exchange between advertisers and users, letting people monetize their own browsing habits and attention while giving advertisers more accurate targeting data.

---

## 🧠 Team & Approach

### Team Name:  
`Web2.5 Leaders`

### Team Members:  
- Shayan Ahmad (Blockchain Developer)
- Ved M deshmukh (AI and Full-Stack Developer)

### Our Approach:  
- We chose this problem because the current digital advertising ecosystem is fundamentally unbalanced, with users providing value but receiving little in return.
- Key challenges addressed included creating a privacy-respecting interest profile system, designing engaging reward mechanics, and integrating with multiple blockchain networks.
- We pivoted from a pure advertising model to include surveys and sponsored quests to provide more immediate value to users while building our user base.

---

## 🛠️ Tech Stack

### Core Technologies Used:
- Frontend: React, TailwindCSS, Framer Motion
- Backend: Chrome Extension APIs, Node.js
- Blockchain: Base (Sepolia), Stellar
- Storage: Chrome Storage API, IPFS
- APIs: Groq LLM-based content analysis

### Sponsor Technologies Used:
- [x] **Base:** Used OnchainKit for wallet integration and token rewards
- [x] **Stellar:** Implemented cross-chain badge synchronization
- [x] **Groq:** Leveraged Groq's ultra-fast LLM API for real-time content analysis and personalized survey generation
- [ ] **Monad:** _Not implemented in current version_
- [ ] **Fluvio:** _Not implemented in current version_
- [ ] **Screenpipe:** _Not implemented in current version_

---

## ✨ Key Features

- ✅ **Smart Content Analysis**: Automatically extracts keywords and interests from browsed content using Groq's high-performance LLM
- ✅ **Persona Portal**: Users can view and edit their interest profiles with complete control
- ✅ **Token Rewards**: Earn PERS tokens for completing surveys and quests
- ✅ **NFT Achievement Badges**: Collect unique badges for completing different activities
- ✅ **Tier System**: Progress through reward tiers (Bronze to Grandmaster) for higher rewards
- ✅ **Cross-Chain Integration**: Sync NFT badges between Base and Stellar blockchain networks
- ✅ **Dynamic Survey Generation**: AI-powered surveys tailored to browsing interests and website content

---

## 📽️ Demo & Deliverables

- **Demo Video Link:** [PersonaRewards Demo](https://youtu.be/demo-link)
- **Pitch Deck Link:** [PersonaRewards Pitch](https://docs.google.com/presentation/d/personarewards)
- **Live Prototype:** Access our browser extension [here](https://github.com/your-team/personarewards/releases)

---

## ✅ Tasks & Bonus Checklist

- [x] **All members of the team completed the mandatory task - Followed at least 2 of our social channels and filled the form**
- [x] **All members of the team completed Bonus Task 1 - Sharing of Badges and filled the form (2 points)**
- [x] **All members of the team completed Bonus Task 2 - Signing up for Sprint.dev and filled the form (3 points)**

---

## 🧪 How to Run the Project

### Requirements:
- Node.js v16+
- Chrome browser
- Metamask extension with Base Sepolia configured
- Base Sepolia testnet ETH for gas

### Local Setup:
```bash
# Clone the repo
git clone https://github.com/your-team/personarewards

# Install dependencies
cd personarewards
npm install

# Build the extension
npm run build

# Load the extension in Chrome
# 1. Open Chrome and go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" and select the "dist" directory
```

### Environment Setup:
Create a .env file in the root directory with:
```
REACT_APP_REWARD_TOKEN_ADDRESS=0x6FDEAC95fe672E19a8759db03d6c24b25d9B8D92
REACT_APP_BADGE_CONTRACT_ADDRESS=0x4475F90A71cb504539Ce1118cC7d343dC65153E7
REACT_APP_GROQ_API_KEY=your-groq-api-key
```

---

## 💫 Groq Integration

We've integrated Groq's ultra-fast LLM API to power several key features:

1. **Real-time Content Analysis**: Groq's low-latency inference allows us to analyze web page content in milliseconds, extracting relevant keywords and interests without disrupting the user experience.

2. **Dynamic Survey Generation**: We use Groq to generate personalized survey questions based on the content of the websites users visit, ensuring highly relevant engagement.

3. **Interest Profile Enhancement**: Groq helps identify nuanced interests and categories from browsing patterns that traditional keyword extraction might miss.

4. **Verification Challenge Creation**: For our sponsored quests, Groq generates verification questions that test actual comprehension of content, preventing reward system abuse.

The speed of Groq's API was crucial for our extension, allowing content processing to happen instantly without noticeable delays for the user, which traditional LLM APIs would have made impossible in a browser extension context.

---

## 🧬 Future Scope

- 📈 **Advertiser Portal**: Allow advertisers to create campaigns and target users based on interests
- 🛡️ **Enhanced Privacy Controls**: Add privacy scoring and more granular data sharing options
- 🌐 **Mobile App Version**: Extend functionality to mobile browsers
- 💰 **Real Ad Revenue Sharing**: Direct revenue sharing from actual ad impressions and clicks
- 🔍 **Improved Content Analysis**: More sophisticated content understanding for better targeting
- 🔄 **Enhanced Groq Integration**: Implement more advanced AI features using Groq's next-gen models

---

## 📎 Resources / Credits

- Base Blockchain and OnchainKit for wallet integration
- Stellar SDK for cross-chain functionality
- Groq API for high-performance LLM inference
- TailwindCSS for UI components
- OpenZeppelin for smart contract templates
- IPFS for decentralized storage of badge metadata
- Framer Motion for UI animations

---

## 🏁 Final Words

Building PersonaRewards during this hackathon has been an exciting journey into reimagining the relationship between users and digital advertising. Our biggest challenge was balancing user privacy with effective interest profiling, which we addressed by giving users full transparency and control. The integration of Groq's LLM API was a game-changer, enabling real-time content analysis that would have been impractically slow with other providers.

We're proud of creating a system that shifts value back to users while still providing valuable data for advertisers - a win-win model for the future of digital advertising.

---

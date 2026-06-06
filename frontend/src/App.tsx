import { Routes, Route } from "react-router-dom";
import { WalletProvider } from "@/contexts/WalletContext";
import Home from "@/pages/Home";
import Scan from "@/pages/Scan";
import BuildProof from "@/pages/BuildProof";
import MyCredentials from "@/pages/MyCredentials";

export default function App() {
  return (
    <WalletProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/build-proof" element={<BuildProof />} />
        <Route path="/credentials" element={<MyCredentials />} />
      </Routes>
    </WalletProvider>
  );
}

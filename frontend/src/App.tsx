import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import TableMenu from "@/pages/TableMenu";
import CashierTerminal from "@/pages/CashierTerminal";
import AdminDashboard from "@/pages/AdminDashboard";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/t/:table" element={<TableMenu />} />
        <Route path="/cashier" element={<CashierTerminal />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <Toaster richColors />
    </>
  );
}

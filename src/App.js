import { BrowserRouter, Routes, Route } from "react-router-dom":
import App from "./app/Produits";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Produits />}>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
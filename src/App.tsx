import { BrowserRouter, HashRouter, Link, Route, Routes } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Pets from './pages/Pets';
import PetDetail from './pages/PetDetail';
import Donations from './pages/Donations';
import About from './pages/About';
import Articles from './pages/Articles';
import Adoption from './pages/Adoption';
import Volunteer from './pages/Volunteer';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Privacy from './pages/Privacy';
import { SiteContentProvider } from './lib/site-content';
import './styles/global.css';
import './styles/forms-admin.css';
import './styles/content-admin.css';
import './styles/content-preview.css';

const hashRouting = import.meta.env.VITE_ROUTER_MODE === 'hash';
const Router = hashRouting ? HashRouter : BrowserRouter;

function NotFound() {
    return (
        <div className="container not-found">
            <PawPrint size={58} />
            <span className="eyebrow">ERRO 404</span>
            <h1>Essa página deu uma escapadinha.</h1>
            <p>Mas tem um novo amigo esperando por você bem aqui.</p>
            <Link to="/adotar" className="button button-primary">
                Conhecer os animais
            </Link>
        </div>
    );
}

export default function App() {
    return (
        <Router basename={hashRouting ? undefined : import.meta.env.BASE_URL}>
            <SiteContentProvider>
                <Routes>
                    <Route element={<Layout />}>
                        <Route index element={<Home />} />
                        <Route path="adotar" element={<Pets />} />
                        <Route path="amigos/:petId" element={<PetDetail />} />
                        <Route path="adotar/:petId" element={<Adoption />} />
                        <Route path="doar" element={<Donations />} />
                        <Route path="sobre" element={<About />} />
                        <Route path="voluntariado" element={<Volunteer />} />
                        <Route path="conteudos" element={<Articles />} />
                        <Route path="conteudos/:slug" element={<Articles />} />
                        <Route path="privacidade" element={<Privacy />} />
                        <Route path="admin/entrar" element={<Login />} />
                        <Route path="admin" element={<Admin />} />
                        <Route path="*" element={<NotFound />} />
                    </Route>
                </Routes>
            </SiteContentProvider>
        </Router>
    );
}

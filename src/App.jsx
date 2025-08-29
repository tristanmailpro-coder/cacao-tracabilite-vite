import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
    getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, query, getDocs, where, setDoc
} from 'firebase/firestore';
import { setLogLevel } from "firebase/app";

// --- Configuration Firebase (Clés en dur) ---
const appId = "c_25d65316111a4976_cacao_traceability_app_v5-17";
const firebaseConfig = {
  apiKey: "AIzaSyCqyCcs2R2e7AegGjvFAwG98wlamtbHvZY",
  authDomain: "bard-frontend.firebaseapp.com",
  projectId: "bard-frontend",
  storageBucket: "bard-frontend.firebasestorage.app",
  messagingSenderId: "175205271074",
  appId: "1:175205271074:web:2b7bd4d34d33bf38e6ec7b"
};

// --- Constantes ---
const CACAO_TYPES = ["Criollo", "Criollo Organic", "Forastero", "Forastero Organic", "Mix", "Mix Organic"];

// --- Icônes (SVG) ---
const UserGroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>;
const CubeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M17.707 9.293l-7-7a1 1 0 00-1.414 0l-7 7A1 1 0 003 11h14a1 1 0 00.707-1.707zM16 12H4a1 1 0 00-1 1v4a1 1 0 001 1h12a1 1 0 001-1v-4a1 1 0 00-1-1z" /></svg>;
const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.72 7 7.25 7 8.5c0 1.25.488 2.78 1.668 3.279a6.012 6.012 0 01-1.912 2.706C5.488 13.22 5 11.75 5 10.5c0-1.25.488-2.78 1.668-3.279zM15.668 11.973c1.18-.499 1.668-2.029 1.668-3.279 0-1.25-.488-2.78-1.668-3.279a6.012 6.012 0 011.912 2.706C17.512 8.72 17 10.25 17 11.5c0 1.25.488 2.78 1.668 3.279a6.012 6.012 0 01-1.912-2.706z" clipRule="evenodd" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;
const PriceTagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>;

// --- Composant Principal ---
export default function App() {
    const [vue, setVue] = useState('lots'); // 'lots', 'producers', 'localities', 'pricing'
    const [detailView, setDetailView] = useState(null); // {type: 'lot'/'producer', item: {}}
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        try {
            setLogLevel('debug');
            const app = initializeApp(firebaseConfig);
            const dbInstance = getFirestore(app);
            const authInstance = getAuth(app);
            setDb(dbInstance);
            onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    try {
                        // Dans un environnement de déploiement, __initial_auth_token n'existera pas, on se connecte anonymement
                        await signInAnonymously(authInstance);
                    } catch (authError) { console.error("Auth Error:", authError); }
                }
            });
        } catch (e) { console.error("Firebase Init Error:", e); }
    }, []);

    const renderContent = () => {
        if (!db || !userId) return <div className="text-center p-8">Chargement de la base de données...</div>;
        if (detailView) {
            if (detailView.type === 'lot') return <LotDetailView db={db} userId={userId} lot={detailView.item} goBack={() => setDetailView(null)} />;
            if (detailView.type === 'producer') return <ProducerDetailView db={db} userId={userId} producer={detailView.item} goBack={() => setDetailView(null)} />;
        }
        switch (vue) {
            case 'producers': return <ProducersView db={db} userId={userId} onSelectProducer={(p) => setDetailView({type: 'producer', item: p})} />;
            case 'localities': return <LocalitiesView db={db} userId={userId} />;
            case 'pricing': return <PricingView db={db} userId={userId} />;
            case 'lots': default: return <LotsView db={db} userId={userId} onSelectLot={(l) => setDetailView({type: 'lot', item: l})} />;
        }
    };

    const NavButton = ({ targetVue, icon, children }) => (
        <button onClick={() => { setVue(targetVue); setDetailView(null); }} className={`px-3 py-2 rounded-full text-sm font-semibold flex items-center ${vue === targetVue && !detailView ? 'bg-white shadow' : 'text-gray-600'}`}>
            {icon} {children}
        </button>
    );

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <header className="bg-white shadow-md sticky top-0 z-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                         <div className="flex items-center">
                            <svg className="h-10 w-10 text-green-700" viewBox="0 0 512 512" fill="currentColor"><path d="M416 160c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32zM96 160c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32zM256 320c-17.67 0-32-14.33-32-32s14.33-32 32-32 32 14.33 32 32-14.33 32-32 32zM256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0zm128 288c0 22.09-17.91 40-40 40h-22.03c-15.98 34.82-50.22 60-90.02 60-39.8 0-74.04-25.18-90.02-60H128c-22.09 0-40-17.91-40-40v-64c0-22.09 17.91-40 40-40h256c22.09 0 40 17.91 40 40v64z"/></svg>
                            <h1 className="text-2xl font-bold text-gray-800 ml-3">Traçabilité Cacao</h1>
                        </div>
                        <nav className="flex space-x-1 bg-gray-200 p-1 rounded-full">
                            <NavButton targetVue="lots" icon={<CubeIcon />}>Lots</NavButton>
                            <NavButton targetVue="producers" icon={<UserGroupIcon />}>Producteurs</NavButton>
                            <NavButton targetVue="localities" icon={<GlobeIcon />}>Localités</NavButton>
                            <NavButton targetVue="pricing" icon={<PriceTagIcon />}>Prix</NavButton>
                        </nav>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">{renderContent()}</main>
        </div>
    );
}

// --- Vue des Prix ---
function PricingView({ db, userId }) {
    const [prices, setPrices] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const pricingCollectionPath = `artifacts/${appId}/users/${userId}/pricing`;

    useEffect(() => {
        const unsub = onSnapshot(collection(db, pricingCollectionPath), (snapshot) => {
            const fetchedPrices = {};
            snapshot.forEach(doc => {
                fetchedPrices[doc.id] = doc.data().price;
            });
            setPrices(fetchedPrices);
        });
        return unsub;
    }, [db, userId]);

    const handlePriceChange = (cacaoType, value) => {
        setPrices(prev => ({ ...prev, [cacaoType]: value }));
    };

    const handleSavePrices = async () => {
        const promises = Object.entries(prices).map(([cacaoType, price]) => {
            if (price !== '' && !isNaN(price)) {
                return setDoc(doc(db, pricingCollectionPath, cacaoType), { price: parseFloat(price) });
            }
            return Promise.resolve();
        });
        await Promise.all(promises);
        setSuccessMessage('Prix enregistrés avec succès !');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4">Gestion des Prix du Cacao (€/kg)</h2>
            {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md text-center font-semibold">{successMessage}</div>}
            <div className="space-y-3">
                {CACAO_TYPES.map(type => (
                    <div key={type} className="flex items-center justify-between">
                        <label className="font-semibold">{type}</label>
                        <input 
                            type="number"
                            value={prices[type] || ''}
                            onChange={(e) => handlePriceChange(type, e.target.value)}
                            placeholder="0.00"
                            className="p-2 border rounded-md w-32 text-right"
                        />
                    </div>
                ))}
            </div>
            <button onClick={handleSavePrices} className="mt-6 w-full p-2 bg-green-600 text-white rounded-md hover:bg-green-700">Enregistrer les prix</button>
        </div>
    );
}

// --- Vue des Localités ---
function LocalitiesView({ db, userId }) {
    const [localities, setLocalities] = useState([]);
    const [producers, setProducers] = useState([]);
    const [newLocalityName, setNewLocalityName] = useState('');

    useEffect(() => {
        const unsubProducers = onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/producers`), (snapshot) => setProducers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubLocalities = onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/localities`), (snapshot) => setLocalities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        return () => { unsubProducers(); unsubLocalities(); };
    }, [db, userId]);

    const handleAddLocality = async (e) => {
        e.preventDefault();
        if (newLocalityName.trim() === '') return;
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/localities`), { name: newLocalityName });
        setNewLocalityName('');
    };

    const producersByLocality = useMemo(() => localities.map(loc => ({ ...loc, producers: producers.filter(p => p.localityId === loc.id) })), [localities, producers]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4">Gestion des Localités</h2>
            <form onSubmit={handleAddLocality} className="flex gap-2 mb-4">
                <input type="text" value={newLocalityName} onChange={e => setNewLocalityName(e.target.value)} placeholder="Nom de la localité" className="p-2 border rounded-md w-full" />
                <button type="submit" className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"><PlusIcon /></button>
            </form>
            <div className="space-y-4">
                {producersByLocality.map(loc => (
                    <div key={loc.id} className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-bold text-lg">{loc.name}</h3>
                        <p className="text-sm text-gray-600">Nombre de producteurs: {loc.producers.length}</p>
                        {loc.producers.length > 0 && <ul className="mt-2 text-sm list-disc list-inside">{loc.producers.map(p => <li key={p.id}>{p.name}</li>)}</ul>}
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- Vue des Producteurs ---
function ProducersView({ db, userId, onSelectProducer }) {
    const [producers, setProducers] = useState([]);
    const [localities, setLocalities] = useState([]);
    const [form, setForm] = useState({ name: '', gender: 'Homme', age: '', localityId: '' });

    useEffect(() => {
        const unsubProducers = onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/producers`), (snap) => setProducers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubLocalities = onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/localities`), (snap) => setLocalities(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => { unsubProducers(); unsubLocalities(); };
    }, [db, userId]);

    const handleAddProducer = async (e) => {
        e.preventDefault();
        if (form.name.trim() === '' || !form.localityId) return;
        const localityName = localities.find(l => l.id === form.localityId)?.name || '';
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/producers`), { ...form, localityName });
        setForm({ name: '', gender: 'Homme', age: '', localityId: '' });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold mb-4">Ajouter un Producteur</h2>
                <form onSubmit={handleAddProducer} className="space-y-3">
                    <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nom complet" className="p-2 border rounded-md w-full" />
                    <input type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})} placeholder="Âge" className="p-2 border rounded-md w-full" />
                    <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="p-2 border rounded-md w-full"><option>Homme</option><option>Femme</option></select>
                    <select value={form.localityId} onChange={e => setForm({...form, localityId: e.target.value})} className="p-2 border rounded-md w-full"><option value="">-- Sélectionner Localité --</option>{localities.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                    <button type="submit" className="w-full p-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"><PlusIcon /> Ajouter</button>
                </form>
            </div>
            <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold mb-4">Liste des Producteurs</h2>
                <ul className="space-y-2">{producers.map(p => <li key={p.id} onClick={() => onSelectProducer(p)} className="p-3 rounded-md cursor-pointer hover:bg-gray-100 flex justify-between"><span>{p.name}</span><span className="text-sm text-gray-500">{p.localityName}</span></li>)}</ul>
            </div>
        </div>
    );
}

// --- Vue Détail Producteur ---
function ProducerDetailView({ db, userId, producer, goBack }) {
    const [plots, setPlots] = useState([]);
    const [sales, setSales] = useState([]);
    const [showAddPlot, setShowAddPlot] = useState(false);
    const [plotForm, setPlotForm] = useState({ name: '', gps: '', cacaoType: CACAO_TYPES[0] });

    useEffect(() => {
        const plotsUnsub = onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/producers/${producer.id}/plots`), snap => setPlots(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const fetchSales = async () => {
            if (!userId) return;
            const lotsCollectionPath = `artifacts/${appId}/users/${userId}/lots`;
            const lotsSnapshot = await getDocs(collection(db, lotsCollectionPath));
            const salesPromises = lotsSnapshot.docs.map(lotDoc => getDocs(query(collection(db, `${lotsCollectionPath}/${lotDoc.id}/harvests`), where('producerId', '==', producer.id))));
            const allHarvestsSnapshots = await Promise.all(salesPromises);
            const allSales = allHarvestsSnapshots.flatMap(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setSales(allSales);
        };
        fetchSales();
        return () => { plotsUnsub(); };
    }, [db, userId, producer.id]);

    const handleAddPlot = async (e) => {
        e.preventDefault();
        if (!plotForm.name || !plotForm.cacaoType) return;
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/producers/${producer.id}/plots`), plotForm);
        setPlotForm({ name: '', gps: '', cacaoType: CACAO_TYPES[0] });
        setShowAddPlot(false);
    };

    const totalRevenue = useMemo(() => sales.reduce((acc, sale) => acc + (sale.totalPrice || 0), 0), [sales]);
    const totalQuantity = useMemo(() => sales.reduce((acc, sale) => acc + (sale.quantity || 0), 0), [sales]);

    return (
        <div>
            <button onClick={goBack} className="mb-6 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 flex items-center"><BackIcon /> Retour</button>
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold">{producer.name}</h2>
                <p className="text-gray-600">{producer.age} ans, {producer.gender}, {producer.localityName}</p>
                <div className="mt-6">
                    <div className="flex justify-between items-center"><h3 className="font-bold text-lg">Parcelles</h3><button onClick={() => setShowAddPlot(!showAddPlot)} className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 text-xs"><PlusIcon /></button></div>
                    {showAddPlot && (
                        <form onSubmit={handleAddPlot} className="mt-2 p-4 border rounded-lg bg-gray-50 space-y-2">
                            <input type="text" value={plotForm.name} onChange={e => setPlotForm({...plotForm, name: e.target.value})} placeholder="Nom de la parcelle" className="p-2 border rounded-md w-full" />
                            <input type="text" value={plotForm.gps} onChange={e => setPlotForm({...plotForm, gps: e.target.value})} placeholder="Coordonnées GPS (optionnel)" className="p-2 border rounded-md w-full" />
                            <select value={plotForm.cacaoType} onChange={e => setPlotForm({...plotForm, cacaoType: e.target.value})} className="p-2 border rounded-md w-full">{CACAO_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                            <button type="submit" className="w-full p-2 bg-green-600 text-white rounded-md">Ajouter Parcelle</button>
                        </form>
                    )}
                    <ul className="space-y-2 mt-2">{plots.map(plot => <li key={plot.id} className="p-2 bg-gray-100 rounded-md flex justify-between"><span>{plot.name} ({plot.cacaoType})</span><span className="text-sm text-gray-400">{plot.gps}</span></li>)}</ul>
                </div>
                <div className="mt-6">
                    <h3 className="font-bold text-lg">Historique des Ventes</h3>
                    <div className="grid grid-cols-2 gap-4 my-4 text-center">
                        <div className="p-4 bg-green-100 rounded-lg"><p className="text-sm text-green-800">Revenu Total</p><p className="text-2xl font-bold text-green-900">{totalRevenue.toFixed(2)} €</p></div>
                        <div className="p-4 bg-blue-100 rounded-lg"><p className="text-sm text-blue-800">Quantité Totale</p><p className="text-2xl font-bold text-blue-900">{totalQuantity.toFixed(2)} kg</p></div>
                    </div>
                    <ul className="space-y-2 mt-2">{sales.map(sale => <li key={sale.id} className="p-3 bg-gray-100 rounded-md"><p>Date: {new Date(sale.date).toLocaleDateString('fr-FR')}</p><p>Quantité: {sale.quantity} kg | Prix/kg: {sale.pricePerKg}€ | Total: {sale.totalPrice}€</p></li>)}</ul>
                </div>
            </div>
        </div>
    );
}

// --- Vue des Lots ---
function LotsView({ db, userId, onSelectLot }) {
    const [lots, setLots] = useState([]);
    const [newLotNumber, setNewLotNumber] = useState('');
    useEffect(() => {
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/lots`));
        const unsubscribe = onSnapshot(q, (snapshot) => setLots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        return unsubscribe;
    }, [db, userId]);
    const handleAddLot = async (e) => {
        e.preventDefault();
        if (newLotNumber.trim() === '') return;
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/lots`), { number: newLotNumber, createdAt: new Date().toISOString(), status: 'harvesting' });
        setNewLotNumber('');
    };
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4">Gestion des Lots</h2>
            <form onSubmit={handleAddLot} className="flex gap-2 mb-4">
                <input type="text" value={newLotNumber} onChange={e => setNewLotNumber(e.target.value)} placeholder="Numéro du nouveau lot" className="p-2 border rounded-md w-full" />
                <button type="submit" className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"><PlusIcon /></button>
            </form>
            <div className="space-y-3">{lots.map(lot => <div key={lot.id} onClick={() => onSelectLot(lot)} className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-green-100 flex justify-between items-center"><div><p className="font-bold text-lg">Lot N°: {lot.number}</p><p className="text-sm text-gray-500">Créé le: {new Date(lot.createdAt).toLocaleDateString('fr-FR')}</p></div><span className="px-3 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full capitalize">{lot.status}</span></div>)}</div>
        </div>
    );
}

// --- Vue Détail d'un Lot ---
function LotDetailView({ db, userId, lot, goBack }) {
    const [currentView, setCurrentView] = useState('process');
    const [producers, setProducers] = useState([]);
    const [harvests, setHarvests] = useState([]);
    const [fermentationSteps, setFermentationSteps] = useState([]);
    const [dryingSteps, setDryingSteps] = useState([]);
    const [prices, setPrices] = useState({});
    const lotDocPath = `artifacts/${appId}/users/${userId}/lots/${lot.id}`;

    useEffect(() => {
        const unsubProducers = onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/producers`), snap => setProducers(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubHarvests = onSnapshot(collection(db, `${lotDocPath}/harvests`), snap => setHarvests(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubFermentation = onSnapshot(collection(db, `${lotDocPath}/fermentation_steps`), snap => setFermentationSteps(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubDrying = onSnapshot(collection(db, `${lotDocPath}/drying_steps`), snap => setDryingSteps(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubPrices = onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/pricing`), snap => {
            const fetchedPrices = {};
            snap.forEach(doc => { fetchedPrices[doc.id] = doc.data().price; });
            setPrices(fetchedPrices);
        });
        return () => { unsubProducers(); unsubHarvests(); unsubFermentation(); unsubDrying(); unsubPrices(); };
    }, [db, userId, lot.id]);

    const moveToStage = async (stage) => await updateDoc(doc(db, lotDocPath), { status: stage });

    const renderProcessView = () => {
        switch (lot.status) {
            case 'harvesting': return <HarvestingView db={db} userId={userId} lotDocPath={lotDocPath} producers={producers} harvests={harvests} prices={prices} moveToStage={moveToStage} />;
            case 'fermentation': return <FermentationView db={db} lotDocPath={lotDocPath} steps={fermentationSteps} moveToStage={moveToStage} />;
            case 'drying': return <DryingView db={db} lotDocPath={lotDocPath} steps={dryingSteps} moveToStage={moveToStage} />;
            case 'bagging': return <BaggingView db={db} lotDocPath={lotDocPath} moveToStage={moveToStage} />;
            case 'complete': return <div className="p-4 border rounded-lg bg-green-100 text-green-800 text-center"><h3 className="font-bold text-lg mb-2">Lot Terminé</h3><p>Le processus pour ce lot est complet. Consultez le rapport.</p></div>;
            default: return null;
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <button onClick={goBack} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 flex items-center"><BackIcon /> Retour</button>
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-full">
                    <button onClick={() => setCurrentView('process')} className={`px-4 py-2 rounded-full text-sm font-semibold ${currentView === 'process' ? 'bg-white shadow' : ''}`}>Processus</button>
                    <button onClick={() => setCurrentView('report')} className={`px-4 py-2 rounded-full text-sm font-semibold ${currentView === 'report' ? 'bg-white shadow' : ''}`}>Rapport</button>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4">Détail du Lot N°: {lot.number}</h2>
                {currentView === 'process' ? renderProcessView() : <LotReportView lot={lot} harvests={harvests} fermentationSteps={fermentationSteps} dryingSteps={dryingSteps} />}
            </div>
        </div>
    );
}

// --- Sous-composants pour LotDetailView ---

function HarvestingView({ db, userId, lotDocPath, producers, harvests, prices, moveToStage }) {
    const [plots, setPlots] = useState([]);
    const [form, setForm] = useState({ producerId: '', plotId: '', quantity: '' });
    const [autoData, setAutoData] = useState({ cacaoType: '', pricePerKg: 0 });
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    
    const resetForm = () => {
        setForm({ producerId: '', plotId: '', quantity: '' });
    };

    useEffect(() => {
        if (form.producerId && userId) {
            const plotsPath = `artifacts/${appId}/users/${userId}/producers/${form.producerId}/plots`;
            const unsub = onSnapshot(collection(db, plotsPath), snap => {
                setPlots(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
            return unsub;
        } else {
            setPlots([]);
        }
    }, [form.producerId, db, userId]);

    useEffect(() => {
        if (form.plotId && plots.length > 0) {
            const selectedPlot = plots.find(p => p.id === form.plotId);
            if (selectedPlot) {
                const cacaoType = selectedPlot.cacaoType;
                const pricePerKg = prices[cacaoType] || 0;
                setAutoData({ cacaoType, pricePerKg });
            }
        } else {
            setAutoData({ cacaoType: '', pricePerKg: 0 });
        }
    }, [form.plotId, plots, prices]);

    const handleAddHarvest = async (e) => {
        e.preventDefault();
        setSuccessMessage(''); setErrorMessage('');
        const { producerId, plotId, quantity } = form;
        if (!producerId || !plotId || !quantity) {
            setErrorMessage("Veuillez sélectionner un producteur, une parcelle et entrer une quantité.");
            setTimeout(() => setErrorMessage(''), 4000);
            return;
        }
        try {
            const producer = producers.find(p => p.id === producerId);
            const plot = plots.find(p => p.id === plotId);
            
            if (!producer || !plot) {
                setErrorMessage("Erreur: Données de producteur ou parcelle non trouvées.");
                setTimeout(() => setErrorMessage(''), 4000);
                return;
            }

            await addDoc(collection(db, `${lotDocPath}/harvests`), {
                producerId, plotId, date: new Date().toISOString(),
                producerName: producer.name,
                plotName: plot.name,
                cacaoType: autoData.cacaoType,
                pricePerKg: autoData.pricePerKg,
                quantity: parseFloat(quantity),
                totalPrice: parseFloat(quantity) * autoData.pricePerKg,
            });
            setSuccessMessage(`Collecte de ${quantity}kg pour ${producer.name} enregistrée !`);
            setTimeout(() => setSuccessMessage(''), 3000);
            resetForm();
        } catch (error) {
            console.error("Erreur lors de l'ajout de la collecte: ", error);
            setErrorMessage("Une erreur technique est survenue.");
            setTimeout(() => setErrorMessage(''), 4000);
        }
    };

    return (
        <div className="p-4 border rounded-lg">
            <h3 className="font-bold text-lg mb-2">1. Récolte</h3>
            <form onSubmit={handleAddHarvest} className="p-4 bg-gray-50 rounded-md space-y-3">
                {successMessage && <div className="p-3 bg-green-100 text-green-800 rounded-md text-center font-semibold">{successMessage}</div>}
                {errorMessage && <div className="p-3 bg-red-100 text-red-800 rounded-md text-center font-semibold">{errorMessage}</div>}
                <select value={form.producerId} onChange={(e) => setForm({ ...form, producerId: e.target.value, plotId: '' })} className="p-2 border rounded-md w-full"><option value="">-- Producteur --</option>{producers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                {form.producerId && <select value={form.plotId} onChange={e => setForm({...form, plotId: e.target.value})} className="p-2 border rounded-md w-full"><option value="">-- Parcelle --</option>{plots.map(p => <option key={p.id} value={p.id}>{p.name} ({p.cacaoType})</option>)}</select>}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-2 bg-gray-200 rounded-md text-center"><span className="text-sm text-gray-600">Type Cacao</span><p className="font-bold">{autoData.cacaoType || 'N/A'}</p></div>
                    <div className="p-2 bg-gray-200 rounded-md text-center"><span className="text-sm text-gray-600">Prix/kg</span><p className="font-bold">{autoData.pricePerKg.toFixed(2)} €</p></div>
                </div>
                <input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} placeholder="Quantité collectée (kg)" className="p-2 border rounded-md w-full" />
                {form.quantity > 0 && <p className="text-right font-semibold">Total: {(form.quantity * autoData.pricePerKg).toFixed(2)} €</p>}
                <button type="submit" className="w-full p-2 bg-green-600 text-white rounded-md">Ajouter Récolte</button>
            </form>
            <ul className="mt-4 space-y-2">{harvests.map(h => <li key={h.id} className="p-2 bg-gray-100 rounded-md">{h.quantity}kg de {h.producerName} ({h.cacaoType}) - {h.totalPrice.toFixed(2)}€</li>)}</ul>
            <button onClick={() => moveToStage('fermentation')} className="mt-4 w-full p-2 bg-blue-600 text-white rounded-md">Démarrer la Fermentation</button>
        </div>
    );
}

function FermentationView({ db, lotDocPath, steps, moveToStage }) {
    const [temp, setTemp] = useState('');
    const handleAddStep = async () => {
        if (!temp) return;
        await addDoc(collection(db, `${lotDocPath}/fermentation_steps`), { date: new Date().toISOString(), temperature: parseFloat(temp) });
        setTemp('');
    };
    return (
        <div className="p-4 border rounded-lg">
            <h3 className="font-bold text-lg mb-2">2. Fermentation</h3>
            <div className="p-4 bg-gray-50 rounded-md space-y-3">
                <input type="number" value={temp} onChange={e => setTemp(e.target.value)} placeholder="Température (°C)" className="p-2 border rounded-md w-full" />
                <button onClick={handleAddStep} className="w-full p-2 bg-green-600 text-white rounded-md">Ajouter Étape Fermentation</button>
            </div>
            <ul className="mt-4 space-y-2">{steps.map((step) => <li key={step.id} className="p-2 bg-gray-100 rounded-md">Étape: {step.temperature}°C le {new Date(step.date).toLocaleString('fr-FR')}</li>)}</ul>
            <button onClick={() => moveToStage('drying')} className="w-full p-2 bg-blue-600 text-white rounded-md mt-4">Passer au Séchage</button>
        </div>
    );
}

function DryingView({ db, lotDocPath, steps, moveToStage }) {
    const [humidity, setHumidity] = useState('');
    const handleAddStep = async () => {
        if (!humidity) return;
        await addDoc(collection(db, `${lotDocPath}/drying_steps`), { date: new Date().toISOString(), humidity: parseFloat(humidity) });
        setHumidity('');
    };
    return (
        <div className="p-4 border rounded-lg">
            <h3 className="font-bold text-lg mb-2">3. Séchage</h3>
            <div className="p-4 bg-gray-50 rounded-md space-y-3">
                <input type="number" value={humidity} onChange={e => setHumidity(e.target.value)} placeholder="% humidité" className="p-2 border rounded-md w-full" />
                <button onClick={handleAddStep} className="w-full p-2 bg-green-600 text-white rounded-md">Ajouter Étape Séchage</button>
            </div>
            <ul className="mt-4 space-y-2">{steps.map((step) => <li key={step.id} className="p-2 bg-gray-100 rounded-md">Étape: {step.humidity}% le {new Date(step.date).toLocaleString('fr-FR')}</li>)}</ul>
            <button onClick={() => moveToStage('bagging')} className="w-full p-2 bg-blue-600 text-white rounded-md mt-4">Passer à la Mise en Sac</button>
        </div>
    );
}

function BaggingView({ db, lotDocPath, moveToStage }) {
    const [finalWeight, setFinalWeight] = useState('');
    const handleSave = async () => {
        if (!finalWeight) return;
        await updateDoc(doc(db, lotDocPath), { finalWeight: parseFloat(finalWeight) });
        moveToStage('complete');
    };
    return (
        <div className="p-4 border rounded-lg">
            <h3 className="font-bold text-lg mb-2">4. Mise en Sac</h3>
            <div className="p-4 bg-gray-50 rounded-md space-y-3">
                <input type="number" value={finalWeight} onChange={e => setFinalWeight(e.target.value)} placeholder="Poids final (kg)" className="p-2 border rounded-md w-full" />
                <button onClick={handleSave} className="w-full p-2 bg-green-600 text-white rounded-md">Enregistrer et Terminer le Lot</button>
            </div>
        </div>
    );
}

function LotReportView({ lot, harvests, fermentationSteps, dryingSteps }) {
    const totalFreshWeight = useMemo(() => harvests.reduce((acc, h) => acc + h.quantity, 0), [harvests]);
    const totalCost = useMemo(() => harvests.reduce((acc, h) => acc + h.totalPrice, 0), [harvests]);
    const weightLoss = useMemo(() => {
        if (!totalFreshWeight || !lot.finalWeight) return 0;
        return ((totalFreshWeight - lot.finalWeight) / totalFreshWeight) * 100;
    }, [totalFreshWeight, lot.finalWeight]);
    
    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-bold text-lg mb-2 border-b pb-2">Résumé Financier et Poids</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-2 bg-blue-100 rounded-lg"><p className="text-sm">Poids Frais Total</p><p className="font-bold text-xl">{totalFreshWeight.toFixed(2)} kg</p></div>
                    <div className="p-2 bg-green-100 rounded-lg"><p className="text-sm">Coût d'Achat Total</p><p className="font-bold text-xl">{totalCost.toFixed(2)} €</p></div>
                    <div className="p-2 bg-blue-100 rounded-lg"><p className="text-sm">Poids Final Sec</p><p className="font-bold text-xl">{lot.finalWeight?.toFixed(2) || 'N/A'} kg</p></div>
                    <div className="p-2 bg-red-100 rounded-lg"><p className="text-sm">Perte de Poids</p><p className="font-bold text-xl">{weightLoss.toFixed(1)} %</p></div>
                </div>
            </div>
            <div>
                <h3 className="font-bold text-lg mb-2 border-b pb-2">Détail des Récoltes</h3>
                <ul className="space-y-2">{harvests.map(h => <li key={h.id} className="p-2 bg-gray-50 rounded-md">{h.quantity}kg ({h.cacaoType}) de <strong>{h.producerName}</strong> (Parcelle: {h.plotName}) pour {h.totalPrice.toFixed(2)}€</li>)}</ul>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-bold text-lg mb-2 border-b pb-2">Suivi Fermentation</h3>
                    <ul className="space-y-2">{fermentationSteps.map(s => <li key={s.id} className="p-2 bg-gray-50 rounded-md">{s.temperature}°C le {new Date(s.date).toLocaleDateString()}</li>)}</ul>
                </div>
                 <div>
                    <h3 className="font-bold text-lg mb-2 border-b pb-2">Suivi Séchage</h3>
                    <ul className="space-y-2">{dryingSteps.map(s => <li key={s.id} className="p-2 bg-gray-50 rounded-md">{s.humidity}% le {new Date(s.date).toLocaleDateString()}</li>)}</ul>
                </div>
            </div>
        </div>
    );
}

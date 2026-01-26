import React, { useState, useEffect, useRef } from 'react';
import { User, signOut } from 'firebase/auth';
import * as firestore from 'firebase/firestore';

const { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  updateDoc, 
  doc, 
} = firestore as any;

import { auth, db } from '../services/firebase';
import { 
  LogOut, Tv, Radio, Cpu, ArrowLeft, ArrowRight, Search, Plus, Save, 
  MapPin, Loader2, Edit, X, Globe, Trash2, Crosshair, Server, 
  CheckCircle, Database, Activity, Locate, 
  Link, Download, 
  Navigation, Eye, MessageSquare, AlertTriangle, ShieldCheck, Wifi
} from 'lucide-react';

declare const L: any;

interface DashboardProps {
  user: User;
}

interface GroupItem {
  id: string;
  content: string; 
  data?: Record<string, any>; 
  userId: string;
  userEmail: string;
  createdAt: any | null;
  groupType?: GroupType;
}

type GroupType = 'ctv' | 'telecom' | 'embarcados' | 'painel' | 'tw_local' | 'downloads';
type ViewState = 'home' | GroupType;

const GOOGLE_HYBRID_URL = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';

const SYSTEM_DATA: Record<string, string[]> = {
  "SISTEMA 1": ["TR-1081KS-03 (BC)", "TR-1082KS-13 (BCC)", "BELTI EE-1080KS-04 (MBW)", "BM-1080KS-04", "SE-1081KS-17", "SE-1081KS-03", "SE-1081KS-74", "SE-1081KS-13", "SE-1082KS-95 -(DRIVE)"],
  "SISTEMA 2": ["TR-1081KS-04", "TR-1081KS-52", "TR-1081KS-14 (bsm)", "TR-1081KS-05 (bsm)", "SE-1081KS-52", "SE-1081KS-04", "SE-1081KS-76", "BELTI EE-1080KS-02", "BM-1081KS-02", "SE-1081KS-50", "SE-1081KS-51", "SE-1081KS-56", "SE-1081KS-27", "SE-1081KS-97", "SE-1081KS-14", "SE-1081KS-18 (bsm)", "SE-1080KS-51 (bsm)"],
  "SISTEMA 3": ["TR-1081KS-11", "TR-1081KS-01", "BM-1081KS-03", "BELTI EE-1081KS03 (MBW)", "SE-1081KS-01", "SE-1081KS-70", "SE-1081KS-15", "SE-1081KS-21", "SE-1081KS-11", "SE-1081KS-91"],
  "SISTEMA 4": ["TR-1081KS-02", "TR-1081KS-12", "BM-1081KS-01", "BELTI EE-1081KS-01", "SE-1081KS-02", "SE-1081KS-72", "SE-1081KS-12", "SE-1081KS-23", "SE-1081KS-93"],
  "5ª BRITAGEM": ["BM-1080KS-13", "BM-1080KS-12", "BM-1080KS-11", "TR-1080KS-81", "TR-1085KS-36", "TR-1080KS-83", "TR-1080KS-88", "TR-1080KS-87", "TR-1080KS-82", "TR-1080KS-85", "TR-1080KS-86", "TR-1080KS-80", "TR-1080KS-84"],
  "CASA DE TRANSFERENCIA": ["TR-1082KS-01", "TR-1082KS-02", "TR-1082KS-03", "TR-1082KS-04", "TR-1082KS-05", "TR-1082KS-06", "TR-1080KS-37", "TR-1085KS-01", "TR-1085KS-04", "TR-1083KS-01", "TR-1084KS-01", "TR-1085KS-05", "SE-1084KS-01", "SE-1083KS-01", "SE-1082KS-02", "SE-1082KS-01", "SE-1085KS-23", "SE-1082KS-03", "SE-1082KS-04", "SE-6021KS-01", "SE-1085KS-22"],
  "OVERLAND": ["TR-1083KS-03", "TR-1083KS-04", "SE-1084KS-22", "SE-1084KS-21", "TR-1084KS-02", "TR-1083KS-02", "EE-1084KS-01 (mts)", "EE-1083KS-01 (mts)", "SE-1083KS-02", "SE-1084KS-02"]
};

const groupsConfig = {
  ctv: { id: 'ctv', label: 'CFTV', icon: Tv, color: 'bg-blue-600', textColor: 'text-blue-400', lightColor: 'bg-blue-900/30', borderColor: 'border-blue-800/50', gradient: 'from-blue-600 to-blue-800' },
  telecom: { id: 'telecom', label: 'Telecom', icon: Radio, color: 'bg-indigo-600', textColor: 'text-indigo-400', lightColor: 'bg-indigo-900/30', borderColor: 'border-indigo-800/50', gradient: 'from-indigo-600 to-indigo-800' },
  painel: { id: 'painel', label: 'Painéis', icon: Server, color: 'bg-orange-600', textColor: 'text-orange-400', lightColor: 'bg-orange-900/30', borderColor: 'border-orange-800/50', gradient: 'from-orange-600 to-orange-800' },
  embarcados: { id: 'embarcados', label: 'Embarcados', icon: Cpu, color: 'bg-emerald-600', textColor: 'text-emerald-400', lightColor: 'bg-emerald-900/30', borderColor: 'border-emerald-800/50', gradient: 'from-emerald-600 to-emerald-800' },
  tw_local: { id: 'tw_local', label: 'Local TW', icon: Locate, color: 'bg-purple-600', textColor: 'text-purple-400', lightColor: 'bg-purple-900/30', borderColor: 'border-purple-800/50', gradient: 'from-purple-600 to-purple-800' },
  downloads: { id: 'downloads', label: 'Downloads', icon: Download, color: 'bg-cyan-600', textColor: 'text-cyan-400', lightColor: 'bg-cyan-900/30', borderColor: 'border-cyan-800/50', gradient: 'from-cyan-600 to-cyan-800' },
};

const normalizeText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const cleanTagName = (tag: string) => (tag || "").replace(/^(Item|Tag|Ativo|ITEM|TW|Cam|Tag do Painel|Tag Switch|Tag da Câmera):\s*/gi, '').split('|')[0].trim();

const getCoordinatesFromData = (data: any) => {
  if (!data) return null;
  // Busca por chaves comuns de geolocalização de forma case-insensitive
  const geoKey = Object.keys(data).find(k => 
    k.toLowerCase() === 'geolocalização' || 
    k.toLowerCase() === 'coordinates' || 
    k.toLowerCase() === 'geo' ||
    k.toLowerCase() === 'lat/lng'
  );
  const geo = geoKey ? data[geoKey] : null;
  if (geo) {
    const parts = String(geo).split(',').map((p: string) => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
  }
  return null;
};

const getDrivePreviewUrl = (url: string) => {
  if (!url) return null;
  const match = url.match(/(?:\/d\/|id=)([\w-]+)/);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : null;
};

const MiniMapPreview: React.FC<{ lat: number; lng: number; color?: string }> = ({ lat, lng, color = '#3b82f6' }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, { 
        zoomControl: false, 
        attributionControl: false, 
        dragging: true, 
        scrollWheelZoom: true, 
        touchZoom: true 
      }).setView([lat, lng], 18);

      L.tileLayer(GOOGLE_HYBRID_URL, { maxZoom: 22, maxNativeZoom: 20 }).addTo(mapInstance.current);

      markerRef.current = L.circleMarker([lat, lng], { 
        radius: 8, 
        fillColor: color, 
        color: '#ffffff', 
        weight: 2, 
        opacity: 1, 
        fillOpacity: 1 
      }).addTo(mapInstance.current);
    } else {
      mapInstance.current.setView([lat, lng], 18);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }

    return () => {
      if (mapInstance.current && !mapRef.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [lat, lng, color]);

  return (
    <div className="w-full h-44 bg-slate-950 border border-slate-800 shadow-inner mt-2 relative group overflow-hidden">
       <div ref={mapRef} className="absolute inset-0 z-0" />
       <div className="absolute top-2 right-2 z-10 bg-slate-900/80 px-2 py-1 border border-slate-700 text-[7px] font-black text-white uppercase tracking-widest">Live View</div>
    </div>
  );
};

const ConfirmModal: React.FC<{ 
  isOpen: boolean; 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onCancel: () => void; 
  isLoading?: boolean;
}> = ({ isOpen, title, message, onConfirm, onCancel, isLoading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-red-900/50 w-full max-w-sm shadow-2xl">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-red-500">
             <AlertTriangle size={24} />
             <h3 className="font-black uppercase tracking-widest text-sm">{title}</h3>
          </div>
          <p className="text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-tight">{message}</p>
        </div>
        <div className="grid grid-cols-2 border-t border-slate-800">
          <button 
            onClick={onCancel} 
            disabled={isLoading}
            className="p-4 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors border-r border-slate-800"
          >
            CANCELAR
          </button>
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className="p-4 text-[10px] font-black text-red-500 hover:bg-red-500 hover:text-white uppercase tracking-widest transition-all"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin mx-auto" /> : "CONFIRMAR"}
          </button>
        </div>
      </div>
    </div>
  );
};

const HighlightedText: React.FC<{ text: string; highlight: string; className?: string }> = ({ text, highlight, className = "" }) => {
  if (!highlight.trim()) return <span className={className}>{text}</span>;
  const terms = highlight.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  const pattern = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);
  return (
    <span className={className}>
      {parts.map((part, i) => regex.test(part) ? (
        <mark key={i} className="bg-blue-600 text-white rounded-none px-0.5 font-bold">{part}</mark>
      ) : part)}
    </span>
  );
};

const GlobalMapModal: React.FC<{ items: GroupItem[], onClose: () => void, onSelectItem: (item: GroupItem) => void }> = ({ items, onClose, onSelectItem }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;
    
    // Inicialização do mapa com visualização padrão (Brasil)
    const map = L.map(mapRef.current, { zoomControl: false, maxZoom: 22 }).setView([-15.78, -47.92], 4);
    L.tileLayer(GOOGLE_HYBRID_URL, { maxZoom: 22, maxNativeZoom: 20, detectRetina: true }).addTo(map);
    layerGroupRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    // Forçar atualização do tamanho do contêiner após renderização
    setTimeout(() => {
      map.invalidateSize();
    }, 400);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !layerGroupRef.current) return;
    
    layerGroupRef.current.clearLayers();
    const bounds = L.latLngBounds([]);
    let hasGeo = false;

    items.forEach(item => {
      const coords = getCoordinatesFromData(item.data);
      if (coords) {
        const { lat, lng } = coords;
        let color = '#3b82f6';
        if (item.groupType === 'telecom') color = '#6366f1';
        if (item.groupType === 'painel') color = '#f97316';
        if (item.groupType === 'embarcados') color = '#10b981';
        if (item.groupType === 'tw_local') color = '#a855f7';
        if (item.groupType === 'downloads') color = '#06b6d4';
        
        const tagName = cleanTagName(item.data?.["Tag"] || item.data?.["Tag Switch"] || item.data?.["Tag da Câmera"] || item.data?.["Tag do Painel"] || item.data?.["Nome"] || "Ativo");
        
        const marker = L.circleMarker([lat, lng], { 
          radius: 8, 
          fillColor: color, 
          color: '#ffffff', 
          weight: 2, 
          opacity: 1, 
          fillOpacity: 1 
        });

        marker.bindTooltip(tagName, { 
          permanent: true, 
          direction: 'top', 
          className: 'tag-label', 
          offset: [0, -8] 
        });

        marker.on('click', () => onSelectItem(item));
        
        layerGroupRef.current.addLayer(marker);
        bounds.extend([lat, lng]);
        hasGeo = true;
      }
    });

    if (hasGeo) {
      mapInstance.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 18 });
    }
  }, [items]);

  return (
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-md">
      <div className="bg-slate-900 w-full h-[100vh] sm:h-[90vh] sm:max-w-6xl overflow-hidden flex flex-col border border-slate-700 shadow-2xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur-xl relative z-20">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20"><Globe size={20} /></div>
             <div><h3 className="font-black text-white text-base tracking-tighter uppercase leading-none">Mapa Geral Satélite</h3><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Google Earth Engine</p></div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 transition-all border border-slate-700 text-slate-400"><X size={24} /></button>
        </div>
        <div className="flex-1 relative bg-black"><div ref={mapRef} className="absolute inset-0 z-0" /></div>
      </div>
    </div>
  );
};

const ItemCard: React.FC<{ 
  item: GroupItem; 
  config: any; 
  onSelect: () => void; 
  onDeleteRequest: (item: GroupItem) => void; 
  searchHighlight: string; 
}> = ({ item, config, onSelect, onDeleteRequest, searchHighlight }) => {
  const data = item.data || {};
  const isPainel = config.id === 'painel';
  const isDownload = config.id === 'downloads';
  const tagValue = cleanTagName(data["Tag"] || data["Tag do Painel"] || data["Nome"] || data["Tag da Câmera"] || data["Tag Switch"] || item.content);
  const hasGeo = !!getCoordinatesFromData(data);

  return (
    <div onClick={onSelect} className="group relative flex flex-col bg-slate-800/50 border border-slate-700 p-0 shadow-lg hover:bg-slate-800 hover:border-blue-500/50 transition-all cursor-pointer active:translate-x-1 active:translate-y-1 overflow-hidden">
      <div className={`h-1 w-full ${config.color}`}></div>
      <div className="p-4 sm:p-5 flex flex-col gap-3 min-h-[140px] sm:min-h-[160px]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-slate-500 tracking-widest mb-0.5 uppercase">{config.label}</p>
            <h3 className="text-sm sm:text-base font-black text-white truncate tracking-tighter group-hover:text-blue-400 transition-colors uppercase">
              <HighlightedText text={tagValue} highlight={searchHighlight} />
            </h3>
          </div>
          <div className="flex items-center gap-1">
             {(isPainel || config.id === 'ctv' || config.id === 'telecom') && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteRequest(item); }} 
                  className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={16} />
                </button>
             )}
             {isDownload ? <div className="p-1.5 bg-slate-900 border border-cyan-500/30 text-cyan-400"><Download size={14} /></div> : null}
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-1.5">
          <div className="flex items-center gap-2 text-slate-400 bg-slate-900/50 px-2.5 py-1.5 border-l-2 border-slate-700">
             {isDownload ? <Database size={10} className="text-cyan-500" /> : <Locate size={10} />}
             <span className="text-[9px] font-bold truncate tracking-tight uppercase">
                <HighlightedText text={data["Local Selecionável"] || data["Local"] || data["Categoria"] || data["Local de Instalação"] || "N/A"} highlight={searchHighlight} />
             </span>
          </div>
          
          <div className="flex flex-wrap gap-1.5 mt-1">
             {(data["Endereço IP"] || data["IP"]) && (
               <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-[8px] font-black text-blue-400 uppercase tracking-tighter">
                  IP: {data["Endereço IP"] || data["IP"]}
               </div>
             )}
             {data["Marca"] && (
               <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-[8px] font-black text-indigo-400 uppercase tracking-tighter">
                  {data["Marca"]}
               </div>
             )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[8px] font-black text-slate-500 pt-2 border-t border-slate-700/50 tracking-widest uppercase mt-auto">
           <span className="flex items-center gap-1.5">
             <div className={`w-1.5 h-1.5 rounded-full ${hasGeo || isDownload ? (isDownload ? 'bg-cyan-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]') : 'bg-slate-700'}`}></div>
             {isDownload ? 'VISUALIZAR' : (hasGeo ? 'SINCRONIZADO' : config.label)}
           </span>
           <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-all" />
        </div>
      </div>
    </div>
  );
};

const ItemDetail: React.FC<{ 
  item: GroupItem; 
  groupKey: string; 
  config: any; 
  user: User; 
  onClose: () => void; 
  onDeleteRequest: (item: GroupItem) => void; 
}> = ({ item, groupKey, config, user, onClose, onDeleteRequest }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>(item.data || {});
  
  const isDownload = groupKey === 'downloads';
  const previewUrl = isDownload ? getDrivePreviewUrl(editData["Link"] || editData["link"]) : null;

  const handleSave = async () => {
      setIsSaving(true);
      try {
          const content = cleanTagName(editData["Tag"] || editData["Nome"] || editData["Tag do Painel"] || editData["Tag da Câmera"] || editData["Tag Switch"] || item.content);
          await updateDoc(doc(db, groupKey, item.id), { data: editData, content });
          setIsEditing(false);
      } catch (e) { alert("Erro ao salvar"); } finally { setIsSaving(false); }
  };

  const showMetadata = isEditing || !isDownload;
  const coords = getCoordinatesFromData(editData);

  return (
      <div className="fixed inset-0 z-[300] bg-slate-900 overflow-y-auto flex flex-col animate-fadeIn">
          <div className="p-4 sm:p-6 bg-slate-800 border-b border-slate-700 text-white flex justify-between items-center sticky top-0 z-20 shadow-xl">
              <div className="flex items-center gap-4 min-w-0">
                <button onClick={onClose} className="p-2.5 bg-slate-700 hover:bg-slate-600 border border-slate-600"><ArrowLeft size={20} /></button>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-black truncate uppercase tracking-tighter">{cleanTagName(editData["Tag"] || editData["Nome"] || editData["Tag do Painel"] || editData["Tag da Câmera"] || editData["Tag Switch"] || "Ficha Técnica")}</h2>
                  <p className="text-[9px] font-black text-slate-500 tracking-widest uppercase mt-1">{config.label} &bull; Registro de Ativo</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(!isEditing)} className="p-2.5 bg-slate-700 border border-slate-600">{isEditing ? <X size={18} /> : <Edit size={18} />}</button>
                {isEditing && <button onClick={handleSave} disabled={isSaving} className="p-2.5 bg-blue-600">{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}</button>}
              </div>
          </div>
          
          <div className="flex-1 bg-slate-950 p-4 sm:p-12 space-y-8 flex flex-col">
              {isDownload && previewUrl && !isEditing && (
                 <div className="flex-1 flex flex-col space-y-4">
                    <div className="flex items-center justify-between bg-slate-900 p-4 border border-slate-800">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Eye size={14} className="text-cyan-400" /> Visualizador de Arquivo</h4>
                       <button onClick={() => window.open(editData["Link"] || editData["link"], '_blank')} className="text-[9px] font-black text-cyan-400 hover:underline uppercase">Baixar Original</button>
                    </div>
                    <div className="flex-1 min-h-[500px] bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden relative">
                       <iframe src={previewUrl} className="w-full h-full border-none bg-white" title="Document Preview" allow="autoplay"></iframe>
                    </div>
                 </div>
              )}

              {showMetadata && (
                <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                    <Database className="text-blue-500" size={20} />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Informações Adicionais</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(editData).map(([key, value]) => {
                        if (key.includes('__EMPTY')) return null;
                        if (!isEditing && (key === "Tag" || key === "Local Selecionável" || key === "Tag do Painel" || key === "Tag da Câmera" || key === "Tag Switch" || key === "Local de Instalação")) return null;
                        if (key.toLowerCase() === "geolocalização" || key.toLowerCase() === "link maps" || key.toLowerCase() === "link") return null;
                        
                        return (
                          <div key={key} className="space-y-2">
                            <h5 className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{key}</h5>
                            {isEditing ? (
                              <input type="text" value={String(value)} onChange={(e) => setEditData({ ...editData, [key]: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-none px-3 py-2 text-white font-bold text-sm outline-none focus:border-blue-500 transition-all uppercase shadow-inner" />
                            ) : (
                              <p className="text-white font-black text-sm p-3 bg-slate-800/50 border border-slate-800 uppercase break-words">{String(value)}</p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {!isDownload && coords && (
                <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8">
                   <div className="mb-4">
                     <MiniMapPreview lat={coords.lat} lng={coords.lng} color={config.textColor.replace('text-', '#')} />
                   </div>
                   <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`, '_blank')} className="w-full py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl">
                      <Navigation size={18} /> Traçar Rota GPS
                   </button>
                </div>
              )}

              {(groupKey === 'painel' || groupKey === 'ctv' || groupKey === 'telecom') && (
                <button 
                  onClick={() => onDeleteRequest(item)}
                  className="w-full py-4 bg-red-950/20 text-red-500 border border-red-900/30 text-[9px] font-black uppercase flex items-center justify-center gap-2"
                >
                   <Trash2 size={14} /> Excluir Registro do Banco
                </button>
              )}
          </div>
      </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [items, setItems] = useState<GroupItem[]>([]);
  const [allData, setAllData] = useState<GroupItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GroupItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<GroupItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({ 
    tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', 
    equipamento: '', customLocal: '', customEquipamento: '', obs: '', 
    desc: '', link: '', nome: '', painel: '', mascara: '', switch_cftv: '', marca: '' 
  });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    // Adicionado 'painel' explicitamente na lista de coleções monitoradas globalmente
    const colls = ['ctv', 'telecom', 'painel', 'embarcados', 'tw_local', 'downloads'];
    const unsubs = colls.map((c, idx) => 
      onSnapshot(collection(db, c), (snap) => {
        const newItems = snap.docs.map(d => ({ 
          id: d.id, 
          ...d.data(), 
          groupType: colls[idx] as GroupType 
        } as GroupItem));
        
        setAllData(prev => {
          const other = prev.filter(i => i.groupType !== colls[idx]);
          return [...other, ...newItems];
        });
      })
    );
    return () => unsubs.forEach(u => u());
  }, []);

  useEffect(() => {
    if (currentView === 'home') return;
    const q = query(collection(db, currentView), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })) as GroupItem[]));
  }, [currentView]);

  const handleGetLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { 
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); 
        setGettingLocation(false); 
      },
      () => { setGettingLocation(false); alert('GPS Falhou'); },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalLocal = formData.local === "NOVO" ? formData.customLocal : formData.local;
      const finalEquip = formData.equipamento === "NOVO" ? formData.customEquipamento : formData.equipamento;
      
      let dataToSave: any = { ...formData };
      
      if (currentView === 'painel') {
          dataToSave = {
              "Tag do Painel": formData.tag,
              "Switch 1": formData.switch1,
              "Switch 2": formData.switch2,
              "Switch 3": formData.switch3,
              "Local Selecionável": finalLocal,
              "Equipamentos": finalEquip,
              "Observações": formData.obs
          };
      } else if (currentView === 'ctv') {
          dataToSave = {
              "Tag da Câmera": formData.tag,
              "Endereço IP": formData.ip,
              "Painel de Conexão": formData.painel,
              "Máscara de Rede": formData.mascara,
              "Local de Instalação": finalLocal,
              "Switch CFTV": formData.switch_cftv,
              "Observações": formData.obs
          };
      } else if (currentView === 'telecom') {
          dataToSave = {
              "Tag Switch": formData.tag,
              "Endereço IP": formData.ip,
              "Máscara de Rede": formData.mascara,
              "Marca": formData.marca,
              "Painel": formData.painel,
              "Local de Instalação": finalLocal,
              "Equipamento": finalEquip,
              "Observações": formData.obs
          };
      } else if (currentView === 'downloads') {
          dataToSave = {
            "Nome": formData.nome,
            "Link": formData.link,
            "Categoria": formData.local || formData.categoria,
            "Descrição": formData.desc || formData.obs
          };
      }

      if (location && currentView !== 'downloads') {
          dataToSave["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
          dataToSave["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}`;
      }

      const tag = formData.tag || formData.nome || "Novo Registro";
      await addDoc(collection(db, currentView), { 
        content: tag, 
        data: dataToSave, 
        userId: user.uid, 
        userEmail: user.email, 
        createdAt: serverTimestamp() 
      });
      setIsModalOpen(false);
      setFormData({ 
        tag: '', local: '', ip: '', switch1: '', switch2: '', switch3: '', 
        equipamento: '', customLocal: '', customEquipamento: '', obs: '', 
        desc: '', link: '', nome: '', painel: '', mascara: '', switch_cftv: '', marca: '' 
      });
      setLocation(null);
    } catch (e) { alert("Erro ao salvar"); } finally { setLoading(false); }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, currentView, itemToDelete.id));
      setItemToDelete(null);
      setSelectedItem(null);
    } catch (e) {
      alert("Erro ao excluir registro.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (currentView !== 'home') {
    const config = groupsConfig[currentView as GroupType];
    
    const filteredItems = items.filter(item => {
      const s = normalizeText(searchTerm.trim());
      if (!s) return true;
      const searchable = [item.content, ...(item.data ? Object.values(item.data) : [])].map(v => normalizeText(String(v))).join(" ");
      return s.split(/\s+/).every(t => searchable.includes(t));
    });

    return (
      <div className="min-h-screen bg-slate-900 flex flex-col animate-fadeIn">
        <header className="bg-slate-800 border-b border-slate-700 p-4 sm:p-6 sticky top-0 z-50 flex justify-between items-center shadow-2xl">
           <div className="flex items-center gap-4 min-w-0">
              <button onClick={() => setCurrentView('home')} className="p-2.5 bg-slate-700 border border-slate-600"><ArrowLeft size={20} /></button>
              <h2 className="text-xl font-black uppercase tracking-tighter truncate">{config.label}</h2>
           </div>
           <button onClick={() => setIsModalOpen(true)} className={`${config.color} text-white px-5 py-3 font-black text-[10px] tracking-widest flex items-center gap-2 shadow-xl uppercase active:translate-y-0.5`}>
             <Plus size={16} /> NOVO
           </button>
        </header>

        <main className="flex-1 p-4 sm:p-12 space-y-6">
          <div className="max-w-4xl mx-auto relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder={`FILTRAR EM ${config.label.toUpperCase()}...`} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-12 pr-4 py-5 bg-slate-800 border border-slate-700 outline-none text-white font-black text-sm uppercase tracking-widest focus:border-blue-500 shadow-2xl" 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <ItemCard 
                key={item.id} 
                item={item} 
                config={config} 
                onSelect={() => setSelectedItem(item)} 
                onDeleteRequest={setItemToDelete}
                searchHighlight={searchTerm} 
              />
            ))}
          </div>
          
          {isModalOpen && (
            <div className="fixed inset-0 z-[400] bg-slate-900/95 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
               <div className="bg-slate-900 w-full max-w-xl h-[95vh] sm:h-auto border-t sm:border border-slate-700 flex flex-col overflow-hidden shadow-2xl">
                  <div className={`p-6 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center shadow-lg`}>
                    <h2 className="text-lg font-black uppercase">Novo Registro</h2>
                    <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                  </div>
                  <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto bg-slate-900">
                     {currentView === 'ctv' ? (
                       <div className="space-y-4">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-1">1. Localização Satélite</label>
                             <button type="button" onClick={handleGetLocation} className="w-full py-4 border text-[9px] font-black uppercase flex items-center justify-center gap-3 transition-all bg-slate-950 border-slate-800 text-blue-400 active:bg-blue-900/10">
                                {gettingLocation ? <Loader2 className="animate-spin" size={16}/> : location ? <CheckCircle className="text-emerald-500" size={16}/> : <Crosshair size={16}/>}
                                {location ? "GPS SINCRONIZADO" : "CAPTURAR LOCALIZAÇÃO"}
                             </button>
                             {location && <MiniMapPreview lat={location.lat} lng={location.lng} color="#3b82f6" />}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">2. Tag da Câmera</label>
                                <input placeholder="CAM-XXX" required className="w-full p-4 bg-slate-950 border border-slate-800 text-white font-bold uppercase outline-none focus:border-blue-500" value={formData.tag || ""} onChange={e => setFormData({...formData, tag: e.target.value})} />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">3. Endereço IP</label>
                                <input placeholder="10.X.X.X" required className="w-full p-4 bg-slate-950 border border-slate-800 text-white font-bold uppercase outline-none focus:border-blue-500" value={formData.ip || ""} onChange={e => setFormData({...formData, ip: e.target.value})} />
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">4. Painel de Conexão</label>
                                <input placeholder="PN-XXX" className="w-full p-4 bg-slate-950 border border-slate-800 text-white font-bold uppercase outline-none focus:border-blue-500" value={formData.painel || ""} onChange={e => setFormData({...formData, painel: e.target.value})} />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">5. Máscara de Rede</label>
                                <input placeholder="255.255.255.0" className="w-full p-4 bg-slate-950 border border-slate-800 text-white font-bold uppercase outline-none focus:border-blue-500" value={formData.mascara || ""} onChange={e => setFormData({...formData, mascara: e.target.value})} />
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-1">6. Local de Instalação</label>
                             <select required className="w-full p-4 bg-slate-950 border border-slate-800 font-bold uppercase text-xs text-white outline-none focus:border-blue-500" value={formData.local || ""} onChange={e => setFormData({...formData, local: e.target.value, customLocal: ''})}>
                                  <option value="">Selecione Local...</option>
                                  {Object.keys(SYSTEM_DATA).map(l => <option key={l} value={l}>{l}</option>)}
                                  <option value="NOVO">+ NOVO LOCAL</option>
                             </select>
                             {formData.local === "NOVO" && <input placeholder="NOME DO NOVO LOCAL" required value={formData.customLocal || ""} className="w-full p-4 bg-blue-900/10 border border-blue-800 text-white font-bold uppercase mt-2" onChange={e => setFormData({...formData, customLocal: e.target.value})} />}
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-1">7. Switch CFTV (Referência)</label>
                             <input placeholder="SW-CFTV-01" className="w-full p-4 bg-slate-950 border border-slate-800 text-white font-bold uppercase outline-none focus:border-blue-500" value={formData.switch_cftv || ""} onChange={e => setFormData({...formData, switch_cftv: e.target.value})} />
                          </div>
                       </div>
                     ) : currentView === 'telecom' ? (
                       <div className="space-y-4">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-1">1. Localização Satélite</label>
                             <button type="button" onClick={handleGetLocation} className="w-full py-4 border text-[9px] font-black uppercase flex items-center justify-center gap-3 transition-all bg-slate-950 border-slate-800 text-indigo-400 active:bg-indigo-900/10">
                                {gettingLocation ? <Loader2 className="animate-spin" size={16}/> : location ? <CheckCircle className="text-emerald-500" size={16}/> : <Crosshair size={16}/>}
                                {location ? "GPS SINCRONIZADO" : "CAPTURAR LOCALIZAÇÃO"}
                             </button>
                             {location && <MiniMapPreview lat={location.lat} lng={location.lng} color="#6366f1" />}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">2. Tag Switch</label>
                                <input placeholder="SW-TEL-XXX" required className="w-full p-4 bg-slate-950 border border-slate-800 text-white font-bold uppercase outline-none focus:border-indigo-500" value={formData.tag || ""} onChange={e => setFormData({...formData, tag: e.target.value})} />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">3. Endereço IP</label>
                                <input placeholder="10.X.X.X" required className="w-full p-4 bg-slate-950 border border-slate-800 text-white font-bold uppercase outline-none focus:border-indigo-500" value={formData.ip || ""} onChange={e => setFormData({...formData, ip: e.target.value})} />
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">4. Máscara de Rede</label>
                                <input placeholder="255.255.255.0" className="w-full p-4 bg-slate-950 border border-slate-800 text-white font-bold uppercase outline-none focus:border-indigo-500" value={formData.mascara || ""} onChange={e => setFormData({...formData, mascara: e.target.value})} />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">5. Marca</label>
                                <input placeholder="Cisco / Dell / HP" className="w-full p-4 bg-slate-950 border border-slate-800 text-white font-bold uppercase outline-none focus:border-indigo-500" value={formData.marca || ""} onChange={e => setFormData({...formData, marca: e.target.value})} />
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-1">6. Painel de Conexão</label>
                             <input placeholder="PN-XXX" className="w-full p-4 bg-slate-950 border border-slate-800 text-white font-bold uppercase outline-none focus:border-indigo-500" value={formData.painel || ""} onChange={e => setFormData({...formData, painel: e.target.value})} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <label className="text-[9px] font-black text-slate-500 uppercase ml-1">7. Local de Instalação</label>
                               <select required className="w-full p-4 bg-slate-950 border border-slate-800 font-bold uppercase text-xs text-white outline-none focus:border-indigo-500" value={formData.local || ""} onChange={e => setFormData({...formData, local: e.target.value, customLocal: ''})}>
                                    <option value="">Selecione Local...</option>
                                    {Object.keys(SYSTEM_DATA).map(l => <option key={l} value={l}>{l}</option>)}
                               </select>
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-black text-slate-500 uppercase ml-1">8. Equipamento</label>
                               <select required disabled={!formData.local} className="w-full p-4 bg-slate-950 border border-slate-800 font-bold uppercase text-xs text-white disabled:opacity-30 outline-none focus:border-indigo-500" value={formData.equipamento || ""} onChange={e => setFormData({...formData, equipamento: e.target.value})}>
                                    <option value="">Selecione Ativo...</option>
                                    {formData.local && SYSTEM_DATA[formData.local]?.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                               </select>
                            </div>
                          </div>
                       </div>
                     ) : currentView === 'painel' ? (
                       <div className="space-y-4">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-1">1. Localização Satélite</label>
                             <button type="button" onClick={handleGetLocation} className="w-full py-4 border text-[9px] font-black uppercase flex items-center justify-center gap-3 transition-all bg-slate-950 border-slate-800 text-orange-400 active:bg-orange-900/10">
                                {gettingLocation ? <Loader2 className="animate-spin" size={16}/> : location ? <CheckCircle className="text-emerald-500" size={16}/> : <Crosshair size={16}/>}
                                {location ? "GPS SINCRONIZADO" : "CAPTURAR LOCALIZAÇÃO"}
                             </button>
                             {location && <MiniMapPreview lat={location.lat} lng={location.lng} color="#f97316" />}
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-1">2. Tag do Painel</label>
                             <input placeholder="TAG-XXX" required className="w-full p-4 bg-slate-950 border border-slate-800 text-white font-bold uppercase outline-none focus:border-orange-500" value={formData.tag || ""} onChange={e => setFormData({...formData, tag: e.target.value})} />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                             <input placeholder="SW 1 IP" className="p-3 bg-slate-950 border border-slate-800 text-[10px] text-white outline-none focus:border-orange-500" value={formData.switch1 || ""} onChange={e => setFormData({...formData, switch1: e.target.value})} />
                             <input placeholder="SW 2 IP" className="p-3 bg-slate-950 border border-slate-800 text-[10px] text-white outline-none focus:border-orange-500" value={formData.switch2 || ""} onChange={e => setFormData({...formData, switch2: e.target.value})} />
                             <input placeholder="SW 3 IP" className="p-3 bg-slate-950 border border-slate-800 text-[10px] text-white outline-none focus:border-orange-500" value={formData.switch3 || ""} onChange={e => setFormData({...formData, switch3: e.target.value})} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Local / Área</label>
                               <select required className="w-full p-4 bg-slate-950 border border-slate-800 font-bold uppercase text-xs text-white outline-none focus:border-orange-500" value={formData.local || ""} onChange={e => setFormData({...formData, local: e.target.value})}>
                                    <option value="">Selecione Local...</option>
                                    {Object.keys(SYSTEM_DATA).map(l => <option key={l} value={l}>{l}</option>)}
                               </select>
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Ativo Principal</label>
                               <select required disabled={!formData.local} className="w-full p-4 bg-slate-950 border border-slate-800 font-bold uppercase text-xs text-white disabled:opacity-30 outline-none focus:border-orange-500" value={formData.equipamento || ""} onChange={e => setFormData({...formData, equipamento: e.target.value})}>
                                    <option value="">Selecione Ativo...</option>
                                    {formData.local && SYSTEM_DATA[formData.local]?.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                               </select>
                            </div>
                          </div>
                       </div>
                     ) : (
                       <div className="space-y-4">
                          <input placeholder="IDENTIFICAÇÃO (TAG / NOME)" required className="w-full p-4 bg-slate-950 border border-slate-800 text-white font-bold uppercase outline-none focus:border-blue-500" value={formData.tag || formData.nome || ""} onChange={e => setFormData({...formData, [currentView === 'downloads' ? 'nome' : 'tag']: e.target.value})} />
                          <input placeholder="LOCALIZAÇÃO / CATEGORIA" className="w-full p-4 bg-slate-950 border border-slate-800 text-white font-bold uppercase outline-none focus:border-blue-500" value={formData.local || formData.categoria || ""} onChange={e => setFormData({...formData, [currentView === 'downloads' ? 'categoria' : 'local']: e.target.value})} />
                          <textarea placeholder="OBSERVAÇÕES..." className="w-full p-4 bg-slate-950 border border-slate-800 text-white min-h-[100px] uppercase outline-none focus:border-blue-500" value={formData.obs || ""} onChange={e => setFormData({...formData, obs: e.target.value})} />
                       </div>
                     )}
                     <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest shadow-2xl active:translate-y-1">
                        {loading ? <Loader2 className="animate-spin inline mr-2" /> : <Save className="inline mr-2" />} FINALIZAR CADASTRO
                     </button>
                  </form>
               </div>
            </div>
          )}
        </main>

        {selectedItem && (
          <ItemDetail 
            item={selectedItem} 
            groupKey={currentView} 
            config={config} 
            user={user} 
            onClose={() => setSelectedItem(null)} 
            onDeleteRequest={setItemToDelete}
          />
        )}
        
        <ConfirmModal 
          isOpen={!!itemToDelete}
          title="Atenção: Exclusão Permanente"
          message={`VOCÊ ESTÁ PRESTES A EXCLUIR O REGISTRO "${cleanTagName(itemToDelete?.data?.["Tag"] || itemToDelete?.data?.["Tag da Câmera"] || itemToDelete?.data?.["Tag Switch"] || itemToDelete?.data?.["Tag do Painel"] || itemToDelete?.data?.["Nome"] || "")}". ESTA AÇÃO É IRREVERSÍVEL E REMOVERÁ TODOS OS DADOS DO BANCO.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setItemToDelete(null)}
          isLoading={isDeleting}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-14 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 blur-[150px] pointer-events-none"></div>
      
      {isMapModalOpen && (
        <GlobalMapModal 
          items={allData} 
          onClose={() => setIsMapModalOpen(false)} 
          onSelectItem={(item) => { 
            setCurrentView(item.groupType as GroupType); 
            setSelectedItem(item);
            setIsMapModalOpen(false); 
          }} 
        />
      )}

      <header className="flex justify-between items-center mb-10 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-5">
           <div className="p-3 bg-blue-600 text-white shadow-[8px_8px_0px_rgba(30,58,138,0.5)]"><Database size={24} /></div>
           <div>
             <h1 className="text-xl sm:text-4xl font-black uppercase leading-none text-white tracking-tighter">TagFinder <span className="text-blue-500">Enterprise</span></h1>
             <p className="text-[7px] sm:text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mt-1">Industrial Intelligence Engine &bull; 2024</p>
           </div>
        </div>
        <button onClick={() => signOut(auth)} className="p-4 bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-500 transition-all shadow-xl active:scale-95"><LogOut size={22} /></button>
      </header>

      <div className="mb-10 animate-fadeIn">
        <h2 className="text-3xl sm:text-6xl font-black tracking-tighter uppercase leading-none text-white">Olá, <span className="text-blue-600">{user.email?.split('@')[0]}</span></h2>
        <div className="h-1.5 w-20 bg-blue-600 mt-5 mb-8"></div>
        
        <button 
          onClick={() => setIsMapModalOpen(true)}
          className="group relative flex items-center gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-none hover:border-blue-500/50 transition-all shadow-2xl overflow-hidden active:translate-y-1 w-full sm:max-w-md"
        >
          <div className="p-3 bg-blue-600 text-white shadow-lg group-hover:scale-110 transition-transform"><Globe size={24} /></div>
          <div className="text-left">
             <h3 className="text-lg font-black uppercase text-white tracking-tighter">MAPA GERAL SATÉLITE</h3>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Visualize todos os ativos técnicos no terreno</p>
          </div>
          <ArrowRight className="ml-auto text-slate-700 group-hover:text-blue-500 transition-colors" size={24} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 pb-16 flex-1">
        {Object.entries(groupsConfig).map(([key, group]) => (
          <button key={key} onClick={() => setCurrentView(key as GroupType)} className="group bg-slate-900/60 border border-slate-800 p-6 sm:p-8 flex flex-col items-start transition-all hover:bg-slate-800 hover:border-blue-500/50 hover:-translate-y-1 shadow-2xl relative overflow-hidden active:translate-y-0 text-left">
             <div className="absolute top-0 right-0 p-8 bg-white/5 blur-3xl -mr-6 -mt-6"></div>
             <div className={`p-4 mb-6 ${group.lightColor} ${group.textColor} border border-slate-700 group-hover:scale-110 transition-transform`}><group.icon size={22} /></div>
             <h3 className="text-[11px] sm:text-lg font-black uppercase mb-2 text-white group-hover:text-blue-400 transition-colors leading-none">{group.label}</h3>
             <div className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all mt-auto">Acessar <ArrowRight size={12} /></div>
          </button>
        ))}
      </div>

      <footer className="mt-auto pt-8 border-t border-slate-900 text-center">
        <p className="text-[8px] sm:text-[10px] font-black text-slate-800 uppercase tracking-[0.8em] opacity-30 italic">Corporate Asset Management &bull; V4.0.5</p>
      </footer>
    </div>
  );
};

export default Dashboard;
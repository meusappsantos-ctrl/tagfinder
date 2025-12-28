import React, { useState, useEffect, useRef } from 'react';
import { User, signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  updateDoc, 
  doc, 
  Timestamp, 
  writeBatch 
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { LogOut, Tv, Radio, Cpu, ArrowLeft, ArrowRight, Search, Plus, Save, MapPin, Loader2, Navigation, Edit, X, Globe, Trash2, FileSpreadsheet, Database, CheckCircle, Layers } from 'lucide-react';
// @ts-ignore
import { read, utils } from 'xlsx';

interface DashboardProps {
  user: User;
}

interface GroupItem {
  id: string;
  content: string; 
  data?: Record<string, any>; 
  userId: string;
  userEmail: string;
  createdAt: Timestamp | null;
}

type GroupType = 'ctv' | 'telecom' | 'embarcados';
type ViewState = 'home' | GroupType;

const groupsConfig = {
  ctv: { 
    id: 'ctv',
    label: 'CFTV', 
    icon: Tv, 
    color: 'bg-blue-600', 
    textColor: 'text-blue-600',
    lightColor: 'bg-blue-50', 
    borderColor: 'border-blue-200',
    hoverBorder: 'hover:border-blue-400', 
    gradient: 'from-blue-500 to-blue-600'
  },
  telecom: { 
    id: 'telecom',
    label: 'Telecom', 
    icon: Radio, 
    color: 'bg-indigo-600', 
    textColor: 'text-indigo-600',
    lightColor: 'bg-indigo-50', 
    borderColor: 'border-indigo-200',
    hoverBorder: 'hover:border-indigo-400',
    gradient: 'from-indigo-500 to-indigo-600'
  },
  embarcados: { 
    id: 'embarcados',
    label: 'Embarcados', 
    icon: Cpu, 
    color: 'bg-emerald-600', 
    textColor: 'text-emerald-600',
    lightColor: 'bg-emerald-50', 
    borderColor: 'border-emerald-200',
    hoverBorder: 'hover:border-emerald-400',
    gradient: 'from-emerald-500 to-emerald-600'
  },
};

// --- COMPONENT: ITEM DETAIL VIEW ---
const ItemDetail: React.FC<{
  item: GroupItem;
  groupKey: string;
  config: any;
  user: User;
  onClose: () => void;
  onDelete: (id: string) => void;
}> = ({ item, groupKey, config, user, onClose, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for editing
  const [editData, setEditData] = useState<Record<string, any>>(item.data || {});
  const [editTitle, setEditTitle] = useState(item.content); 

  const [location, setLocation] = useState<{lat: number, lng: number} | null>(() => {
     if (item.data?.["Geolocalização"]) {
         const parts = item.data["Geolocalização"].split(',');
         if (parts.length === 2) {
             return { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
         }
     }
     return null;
  });
  const [gettingLocation, setGettingLocation] = useState(false);

  // Helper to get safe fields for display/edit (excluding system/geo fields)
  // Also sorts so "Tag" comes first
  const getFields = () => {
     const entries = Object.entries(editData).filter(([key, value]) => {
         const k = key.toLowerCase();
         const isSystem = k === 'geolocalização' || k === 'link maps';
         const isEmpty = !isEditing && (value === null || value === undefined || String(value).trim() === '');
         return !isSystem && !isEmpty;
     });

     return entries.sort((a, b) => {
        const ka = a[0].toLowerCase();
        const kb = b[0].toLowerCase();
        if (ka === 'tag') return -1;
        if (kb === 'tag') return 1;
        return 0;
     });
  };

  const handleGetLocation = () => {
    setGettingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setGettingLocation(false);
        },
        () => {
          setGettingLocation(false);
          alert('Erro ao obter localização. Verifique permissões.');
        },
        { enableHighAccuracy: true }
      );
    } else {
        setGettingLocation(false);
        alert("Geolocalização não suportada.");
    }
  };

  const handleSave = async () => {
      setIsSaving(true);
      try {
          const docRef = doc(db, groupKey, item.id);
          const finalData = { ...editData };
          
          const tagName = finalData["Tag"] || editTitle || "Equipamento";

          if (location) {
              finalData["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
              finalData["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}(${encodeURIComponent(tagName)})`;
          }

          Object.keys(finalData).forEach(key => {
              if (finalData[key] === "" || finalData[key] === null || finalData[key] === undefined) {
                  delete finalData[key];
              }
          });

          const newContent = finalData["Tag"] ? `Item: ${finalData["Tag"]}` : editTitle;

          await updateDoc(docRef, {
              data: finalData,
              content: newContent
          });
          
          setIsEditing(false);
      } catch (e) {
          console.error(e);
          alert("Erro ao salvar alterações.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleFieldChange = (key: string, value: string) => {
      setEditData(prev => ({ ...prev, [key]: value }));
  };
  
  const handleAddField = () => {
      const name = prompt("Nome do novo campo:");
      if (name && !editData[name]) {
          setEditData(prev => ({ ...prev, [name]: "" }));
      }
  };

  const handleOpenMaps = () => {
    if (location) {
       const tagName = editData["Tag"] || item.content || "Local";
       window.open(`https://maps.google.com/?q=${location.lat},${location.lng}(${encodeURIComponent(tagName)})`, '_blank');
    }
  };

  const handleDownloadKML = () => {
    if (!location) return;
    
    const tagName = editData["Tag"] || item.content || "Sem Tag";
    const description = Object.entries(editData)
      .filter(([k]) => k !== "Geolocalização" && k !== "Link Maps")
      .map(([k, v]) => `<b>${k}:</b> ${v}`)
      .join('<br/>');

    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark>
    <name>${tagName}</name>
    <description><![CDATA[${description}]]></description>
    <Point>
      <coordinates>${location.lng},${location.lat},0</coordinates>
    </Point>
  </Placemark>
</kml>`;

    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tagName.replace(/[^a-z0-9]/gi, '_')}.kml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
      <div className="bg-white min-h-[500px] rounded-3xl border border-gray-200 shadow-xl overflow-hidden flex flex-col animate-slideUp">
          <div className={`p-6 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center sticky top-0 z-10 shadow-md`}>
              <div className="flex items-center gap-4">
                  <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                      <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div className="overflow-hidden">
                      <h2 className="text-xl md:text-2xl font-bold truncate max-w-[200px] md:max-w-md">
                        {isEditing ? "Editando Registro" : (editData["Tag"] || item.content)}
                      </h2>
                      {!isEditing && (
                        <p className="opacity-90 text-sm flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0"/> {editData["Local"] || "Local não definido"}
                        </p>
                      )}
                  </div>
              </div>
              <div className="flex gap-2">
                 {item.userId === user.uid && !isEditing && (
                     <>
                        <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors text-sm font-medium">
                            <Edit className="w-4 h-4" /> <span className="hidden sm:inline">Editar</span>
                        </button>
                        <button onClick={() => onDelete(item.id)} className="p-2 bg-white/20 hover:bg-red-500/80 rounded-lg backdrop-blur-sm transition-colors" title="Excluir">
                            <Trash2 className="w-5 h-5" />
                        </button>
                     </>
                 )}
                 {isEditing && (
                     <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Cancelar Edição">
                        <X className="w-6 h-6" />
                     </button>
                 )}
              </div>
          </div>

          <div className="p-6 md:p-8 space-y-8 flex-1 overflow-y-auto">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className={`p-3 rounded-full flex-shrink-0 ${location ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                          <Navigation className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                          <h4 className="font-bold text-gray-900">Geolocalização</h4>
                          <p className="text-sm text-gray-500 truncate">
                            {location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : "Sem coordenadas gravadas"}
                          </p>
                      </div>
                  </div>
                  
                  {isEditing ? (
                      <button onClick={handleGetLocation} className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg flex justify-center items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium">
                          {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin"/> : <MapPin className="w-4 h-4"/>}
                          Atualizar GPS
                      </button>
                  ) : location && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={handleDownloadKML} className="flex-1 sm:flex-initial px-4 py-3 bg-blue-50 text-blue-600 rounded-xl flex justify-center items-center gap-2 hover:bg-blue-100 transition-colors border border-blue-200 font-semibold" title="Baixar arquivo para Google Earth">
                            <Globe className="w-5 h-5"/>
                            KML Earth
                        </button>
                        <button onClick={handleOpenMaps} className="flex-1 sm:flex-initial px-6 py-3 bg-green-600 text-white rounded-xl flex justify-center items-center gap-2 hover:bg-green-700 transition-colors shadow-md font-semibold transform hover:-translate-y-0.5">
                            <Navigation className="w-5 h-5"/>
                            Como Chegar
                        </button>
                      </div>
                  )}
              </div>

              {isEditing ? (
                  <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                          {getFields().map(([key, value]) => (
                              <div key={key} className="space-y-1.5">
                                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{key}</label>
                                  <input 
                                      type="text" 
                                      value={value} 
                                      onChange={(e) => handleFieldChange(key, e.target.value)}
                                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none bg-white focus:border-blue-500 transition-all text-gray-900"
                                  />
                              </div>
                          ))}
                      </div>
                      <div className="flex justify-start">
                         <button onClick={handleAddField} className="flex items-center gap-1 text-sm text-blue-600 font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                            <Plus className="w-4 h-4"/> Adicionar Campo
                         </button>
                      </div>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getFields().map(([key, value]) => (
                          <div key={key} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                              <h5 className="text-xs font-bold text-gray-400 uppercase mb-2 group-hover:text-blue-500 transition-colors">{key}</h5>
                              <p className="text-gray-900 font-medium break-words text-lg leading-relaxed">{String(value)}</p>
                          </div>
                      ))}
                      {getFields().length === 0 && (
                          <div className="col-span-full text-center py-10 text-gray-400 italic">
                              Nenhum detalhe adicional informado.
                          </div>
                      )}
                  </div>
              )}

              {isEditing && (
                  <div className="flex justify-end pt-6 border-t border-gray-100 sticky bottom-0 bg-white pb-2">
                      <button onClick={handleSave} disabled={isSaving} className={`px-8 py-3 rounded-xl text-white font-bold shadow-lg flex items-center gap-2 ${config.color} hover:opacity-90 transform active:scale-95 transition-all`}>
                          {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5" />}
                          Salvar Alterações
                      </button>
                  </div>
              )}
          </div>
      </div>
  );
};

// --- SUB-COMPONENT: LIST ITEM CARD ---
const ItemCard: React.FC<{
  item: GroupItem;
  config: any;
  onSelect: () => void;
}> = ({ item, config, onSelect }) => {
  const Icon = config.icon;
  const data = item.data || {};
  
  // Logic to show strictly Tag and Local
  let tagValue = data["Tag"] || data["tag"];
  
  if (!tagValue) {
      // Fallback to content, cleaning prefixes
      let content = item.content || "Item sem nome";
      content = content.replace(/^Item:\s*/i, ''); 
      if (content.includes(' | ')) {
          content = content.split(' | ')[0];
      }
      tagValue = content;
  }

  const localValue = data["Local"] || data["local"] || "Local não informado";

  return (
    <div 
      onClick={onSelect}
      className={`bg-white rounded-2xl border ${config.borderColor} shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col overflow-hidden group hover:-translate-y-1 duration-300`}
    >
      <div className={`h-1.5 w-full bg-gradient-to-r ${config.gradient}`}></div>
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className={`p-3 rounded-xl ${config.lightColor} ${config.textColor} group-hover:scale-110 transition-transform`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">{tagValue}</h3>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-0.5">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{localValue}</span>
            </div>
          </div>
        </div>
        <div className="p-2 text-gray-300 group-hover:text-blue-500 transition-colors">
            <ArrowRight className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const GroupPage: React.FC<{ 
  groupKey: GroupType; 
  user: User; 
  onBack: () => void;
}> = ({ groupKey, user, onBack }) => {
  const config = groupsConfig[groupKey];
  const Icon = config.icon;
  
  const [items, setItems] = useState<GroupItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GroupItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualFields, setManualFields] = useState<{key: string, value: string}[]>([]); // Changed to empty array
  const [manualTitle, setManualTitle] = useState('');

  const [cftvData, setCftvData] = useState({
    tag: '',
    painel: '',
    ip: '',
    switch: '',
    local: '',
    equipamento: ''
  });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, groupKey), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GroupItem[];
      setItems(fetchedItems);
    });
    return () => unsubscribe();
  }, [groupKey]);

  if (selectedItem) {
      return (
          <ItemDetail 
              item={selectedItem}
              groupKey={groupKey}
              config={config}
              user={user}
              onClose={() => setSelectedItem(null)}
              onDelete={async (id) => {
                  if(window.confirm("Tem certeza que deseja excluir este item?")) {
                      await deleteDoc(doc(db, groupKey, id));
                      setSelectedItem(null);
                  }
              }}
          />
      );
  }

  const handleGetLocation = () => {
    setGettingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setGettingLocation(false);
        },
        () => {
          setGettingLocation(false);
          alert('Não foi possível obter a localização. Verifique se o GPS está ativo.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      setGettingLocation(false);
      alert('Geolocalização não suportada.');
    }
  };

  const handleAddManualField = () => {
    setManualFields([...manualFields, { key: '', value: '' }]);
  };

  const handleRemoveManualField = (index: number) => {
    const newFields = [...manualFields];
    newFields.splice(index, 1);
    setManualFields(newFields);
  };

  const handleManualFieldChange = (index: number, field: 'key' | 'value', text: string) => {
    const newFields = [...manualFields];
    newFields[index][field] = text;
    setManualFields(newFields);
  };

  const handleCftvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCftvData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveManualDoc = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setLoading(true);
    try {
      let dataObject: Record<string, any> = {};
      let contentTitle = "";

      if (groupKey === 'ctv' || groupKey === 'telecom') {
         if (groupKey === 'ctv' && !cftvData.tag.trim()) {
             alert("A Tag é obrigatória.");
             setLoading(false); 
             return;
         }
         
         const mainTag = cftvData.tag.trim() || manualTitle;
         contentTitle = `Item: ${mainTag}`;
         
         if (cftvData.tag.trim()) dataObject["Tag"] = cftvData.tag.trim();
         if (cftvData.painel.trim()) dataObject["Painel"] = cftvData.painel.trim();
         if (cftvData.ip.trim()) dataObject["IP"] = cftvData.ip.trim();
         if (cftvData.switch.trim()) dataObject["Switch"] = cftvData.switch.trim();
         if (cftvData.local.trim()) dataObject["Local"] = cftvData.local.trim();
         if (cftvData.equipamento.trim()) dataObject["Equipamento"] = cftvData.equipamento.trim();
         
         if (location) {
             dataObject["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
             dataObject["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}(${encodeURIComponent(mainTag)})`;
         }
      } else {
         if (!manualTitle.trim()) {
            alert("Título obrigatório.");
            setLoading(false); 
            return;
         }
         contentTitle = manualTitle;
         manualFields.forEach(f => {
            if (f.key.trim() && f.value.trim()) {
              dataObject[f.key.trim()] = f.value.trim();
            }
         });
         if (location) {
             dataObject["Geolocalização"] = `${location.lat.toFixed(7)}, ${location.lng.toFixed(7)}`;
             dataObject["Link Maps"] = `https://maps.google.com/?q=${location.lat},${location.lng}(${encodeURIComponent(manualTitle)})`;
         }
      }

      await addDoc(collection(db, groupKey), {
        content: contentTitle,
        data: Object.keys(dataObject).length > 0 ? dataObject : null,
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        source: 'manual'
      });

      setCftvData({ tag: '', painel: '', ip: '', switch: '', local: '', equipamento: '' });
      setManualTitle('');
      setManualFields([]); // Reset to empty array
      setLocation(null);
      
      setIsModalOpen(false);
      setNotification({ type: 'success', message: 'Salvo com sucesso!' });
      setTimeout(() => setNotification(null), 3000);

    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', message: 'Erro ao salvar.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[] = utils.sheet_to_json(worksheet, { defval: "" });

      if (jsonData.length === 0) return;

      const chunks = [];
      for (let i = 0; i < jsonData.length; i += 450) chunks.push(jsonData.slice(i, i + 450));

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((row: any) => {
          const cleanData: Record<string, any> = {};
          Object.entries(row).forEach(([k, v]) => {
            if (v !== "" && v !== null && v !== undefined) cleanData[k] = v;
          });

          const docRef = doc(collection(db, groupKey));
          batch.set(docRef, {
            content: Object.values(cleanData).slice(0, 2).join(' | '),
            data: cleanData,
            userId: user.uid,
            userEmail: user.email,
            createdAt: serverTimestamp(),
            source: 'import'
          });
        });
        await batch.commit();
      }
      setNotification({ type: 'success', message: 'Importação concluída!' });
    } catch (error) {
      setNotification({ type: 'error', message: "Erro na importação." });
    } finally {
      setIsImporting(false);
    }
  };

  const filteredItems = items.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    if (item.data) {
      return Object.values(item.data).some(val => String(val).toLowerCase().includes(searchLower));
    }
    return item.content.toLowerCase().includes(searchLower);
  });

  return (
    <div className="animate-fadeIn pb-12 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${config.gradient} text-white shadow-md`}>
            <Icon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{config.label}</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} ref={fileInputRef} className="hidden" id="sheet-upload" />
          <label htmlFor="sheet-upload" className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 transition-all cursor-pointer text-sm font-medium">
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileSpreadsheet className="w-4 h-4" />}
            Importar Excel
          </label>
        </div>
      </div>

      {notification && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between shadow-sm animate-fadeIn ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <p className="font-medium text-sm">{notification.message}</p>
          <button onClick={() => setNotification(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 outline-none" />
        </div>
        <button onClick={() => setIsModalOpen(true)} className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white shadow-md bg-gradient-to-r ${config.gradient}`}>
          <Plus className="w-5 h-5" /> Novo Registro
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
          <Database className="w-8 h-8 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhum dado</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <ItemCard 
              key={item.id} 
              item={item} 
              config={config} 
              onSelect={() => setSelectedItem(item)}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className={`p-6 bg-gradient-to-r ${config.gradient} text-white flex justify-between items-center`}>
              <h3 className="text-xl font-bold">Novo Registro</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSaveManualDoc} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-blue-900">Coordenadas de GPS</label>
                    {location && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Gravado</span>}
                  </div>
                  <button 
                    type="button" 
                    onClick={handleGetLocation} 
                    className={`w-full py-3 rounded-lg text-sm font-medium flex justify-center items-center gap-2 transition-all shadow-sm ${
                      location 
                        ? 'bg-green-500 text-white hover:bg-green-600' 
                        : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    {gettingLocation ? (
                      <Loader2 className="animate-spin w-5 h-5"/> 
                    ) : location ? (
                      <CheckCircle className="w-5 h-5"/> 
                    ) : (
                      <Navigation className="w-5 h-5"/>
                    )}
                    {gettingLocation ? "Obtendo sinal..." : location ? "Localização Ativada e Gravada" : "Ativar GPS e Gravar Coordenadas"}
                  </button>
                  {location && (
                    <p className="text-xs text-center text-blue-400 mt-2 font-mono">
                      {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </p>
                  )}
                </div>

                {groupKey === 'ctv' ? (
                  <>
                    <input type="text" name="tag" value={cftvData.tag} onChange={handleCftvChange} placeholder="Tag (Obrigatório)" className="w-full px-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all" />
                    <input type="text" name="local" value={cftvData.local} onChange={handleCftvChange} placeholder="Localização (Referência)" className="w-full px-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all" />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" name="painel" value={cftvData.painel} onChange={handleCftvChange} placeholder="Painel" className="w-full px-4 py-3 border rounded-lg outline-none text-sm" />
                      <input type="text" name="ip" value={cftvData.ip} onChange={handleCftvChange} placeholder="IP" className="w-full px-4 py-3 border rounded-lg outline-none text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" name="switch" value={cftvData.switch} onChange={handleCftvChange} placeholder="Switch" className="w-full px-4 py-3 border rounded-lg outline-none text-sm" />
                      <input type="text" name="equipamento" value={cftvData.equipamento} onChange={handleCftvChange} placeholder="Modelo" className="w-full px-4 py-3 border rounded-lg outline-none text-sm" />
                    </div>
                  </>
                ) : (
                  <>
                    <input type="text" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="Título do Item" className="w-full px-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                    {manualFields.map((field, index) => (
                      <div key={index} className="flex gap-2">
                        <input type="text" placeholder="Nome do Campo" value={field.key} onChange={(e) => handleManualFieldChange(index, 'key', e.target.value)} className="flex-1 px-3 py-2 text-sm border rounded-lg bg-gray-50" />
                        <input type="text" placeholder="Valor" value={field.value} onChange={(e) => handleManualFieldChange(index, 'value', e.target.value)} className="flex-1 px-3 py-2 text-sm border rounded-lg bg-gray-50" />
                        <button type="button" onClick={() => handleRemoveManualField(index)}><Trash2 className="w-4 h-4 text-gray-400"/></button>
                      </div>
                    ))}
                    <button type="button" onClick={handleAddManualField} className="text-xs text-blue-600 font-bold uppercase tracking-wider py-2">+ Adicionar campo personalizado</button>
                  </>
                )}
              </div>
              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={loading} className={`px-6 py-2 text-white rounded-lg bg-gradient-to-r ${config.gradient} shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all`}>
                  {loading ? <Loader2 className="animate-spin w-5 h-5"/> : "Salvar Registro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [currentView, setCurrentView] = useState<ViewState>('home');

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <Layers className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                    TagFinder
                </h1>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-end">
                    <span className="text-sm font-semibold text-gray-700">{user.displayName || user.email?.split('@')[0]}</span>
                    <span className="text-xs text-gray-400">{user.email}</span>
                </div>
                <button 
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Sair"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {currentView === 'home' ? (
             <div className="animate-fadeIn">
                <div className="mb-10 text-center sm:text-left">
                  <h2 className="text-3xl font-bold text-gray-900">Painel de Controle</h2>
                  <p className="text-gray-500 mt-2">Selecione uma categoria para gerenciar seus registros</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {(Object.entries(groupsConfig) as [GroupType, typeof groupsConfig.ctv][]).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setCurrentView(key)}
                        className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group text-left relative overflow-hidden"
                      >
                        <div className={`absolute top-0 right-0 w-32 h-32 ${config.lightColor} rounded-full -mr-10 -mt-10 opacity-50 group-hover:scale-150 transition-transform duration-500`}></div>
                        <div className={`w-14 h-14 rounded-2xl ${config.lightColor} ${config.textColor} flex items-center justify-center mb-6 relative z-10`}>
                          <Icon className="w-7 h-7" />
                        </div>
                        <div className="relative z-10">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{config.label}</h3>
                          <p className="text-gray-500 text-sm mb-6">Acessar registros e equipamentos de {config.label}</p>
                          <div className={`inline-flex items-center gap-2 font-semibold ${config.textColor}`}>
                            Acessar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
             </div>
        ) : (
            <GroupPage 
                groupKey={currentView} 
                user={user} 
                onBack={() => setCurrentView('home')} 
            />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
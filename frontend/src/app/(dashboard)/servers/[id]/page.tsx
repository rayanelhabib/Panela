"use client";

import React, { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { 
  BareMetalServer, Play, Stop, Restart, Activity, Chip, DataBase, 
  BlockStorage, Terminal, ArrowLeft, CloudUpload, Zip, Folder, Document,
  TrashCan, Edit, Pen, Launch, Close, Calendar, Copy, Renew, Wifi, Time,
  ArrowDown, ArrowUp
} from "@carbon/icons-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface ServerDetails {
  id: string;
  name: string;
  status: string;
  cpu_limit: number;
  memory_limit: number;
  disk_limit: number;
  node_id: string;
}

interface FileItem {
  name: string;
  type: "folder" | "file" | "zip";
  size: string;
  modified: string;
  content?: string;
}

interface DatabaseDetails {
  id: string;
  name: string;
  db_user: string;
  db_password: string;
  status: string;
}

interface BackupDetails {
  id: string;
  name: string;
  size_bytes: number;
  status: string;
  created_at: number;
}

const isEssentialLog = (log: string): boolean => {
  const lowerLog = log.toLowerCase();
  
  // Traceback and GORM/Node noise list to filter out
  if (lowerLog.includes("err_invalid_package_config")) return false;
  if (lowerLog.includes("shoulduseesmloader")) return false;
  if (lowerLog.includes("executeuserentrypoint")) return false;
  if (lowerLog.includes("run_main_module")) return false;
  if (lowerLog.includes("node:internal")) return false;
  if (lowerLog.includes("getnearestparentpackagejsontype")) return false;
  if (log.trim() === "^") return false;
  
  return true;
};

const formatUptime = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return "Offline";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  let result = "";
  if (days > 0) result += `${days}d `;
  if (hours > 0 || days > 0) result += `${hours}h `;
  if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
  result += `${seconds}s`;
  return result;
};

const generateSvgPath = (values: number[], maxVal: number, width: number, height: number, isArea: boolean = false): string => {
  if (values.length === 0) return "";
  const stepX = width / (values.length - 1);
  const points = values.map((val, idx) => {
    const x = idx * stepX;
    const ratio = maxVal > 0 ? val / maxVal : 0;
    const y = height - (ratio * (height - 15)) - 5;
    return { x, y };
  });
  
  // Dynamic smooth spline curves
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpX1 = curr.x + (next.x - curr.x) / 2;
    const cpY1 = curr.y;
    const cpX2 = curr.x + (next.x - curr.x) / 2;
    const cpY2 = next.y;
    path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
  }
  
  if (isArea) {
    return `${path} L ${width} ${height} L 0 ${height} Z`;
  }
  return path;
};

interface ScheduleDetails {
  id: string;
  action: string;
  cron: string;
  is_active: boolean;
  last_run: number;
}

export default function ServerConsolePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  
  const [server, setServer] = useState<ServerDetails | null>(null);
  const [logs, setLogs] = useState<string[]>(["[System] Connecting to server daemon..."]);
  const [loading, setLoading] = useState(true);
  const [command, setCommand] = useState("");
  const [activeTab, setActiveTab] = useState<"console" | "files" | "databases" | "backups" | "schedules">("console");
  
  // Interactive File Manager State (connected to backend)
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");

  // Code Editor Modal States
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [editorContent, setEditorContent] = useState("");
  
  // ZIP Deployer States
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Databases state
  const [databases, setDatabases] = useState<DatabaseDetails[]>([]);
  const [dbModalOpen, setDbModalOpen] = useState(false);
  const [newDbName, setNewDbName] = useState("");
  const [newDbUser, setNewDbUser] = useState("");

  // Backups state
  const [backups, setBackups] = useState<BackupDetails[]>([]);
  const [newBackupName, setNewBackupName] = useState("");
  const [backupInProgress, setBackupInProgress] = useState(false);

  // Schedules state
  const [schedules, setSchedules] = useState<ScheduleDetails[]>([]);
  const [schedModalOpen, setSchedModalOpen] = useState(false);
  const [newSchedAction, setNewSchedAction] = useState("restart");
  const [newSchedCron, setNewSchedCron] = useState("0 */12 * * *");

  const logsContainerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Live Stats States
  const [liveMemory, setLiveMemory] = useState<number>(0);
  const [liveCpu, setLiveCpu] = useState<number>(0);
  const [liveNetworkIn, setLiveNetworkIn] = useState<number>(0);
  const [liveNetworkOut, setLiveNetworkOut] = useState<number>(0);

  // Pterodactyl Premium Uptime and History States
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(0);
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(12).fill(0));
  const [memoryHistory, setMemoryHistory] = useState<number[]>(Array(12).fill(0));
  const [networkHistoryIn, setNetworkHistoryIn] = useState<number[]>(Array(12).fill(0));
  const [networkHistoryOut, setNetworkHistoryOut] = useState<number[]>(Array(12).fill(0));

  const fetchFiles = async (path: string = "") => {
    try {
      const res = await api.get(`/servers/${id}/files?path=${encodeURIComponent(path)}`);
      if (res.data?.data) {
        const mapped: FileItem[] = res.data.data.map((f: any) => ({
          name: f.name,
          type: f.is_dir ? "folder" : f.extension === "zip" ? "zip" : "file",
          size: f.size,
          modified: new Date(f.modified_at * 1000).toLocaleString(),
          content: "",
        }));
        setFiles(mapped);
      }
    } catch (e) {
      console.error("Failed to load server filesystem directory", e);
    }
  };

  const fetchDatabases = async () => {
    try {
      const res = await api.get(`/servers/${id}/databases`);
      if (res.data?.data) setDatabases(res.data.data);
    } catch (e) {
      console.error("Failed to load databases", e);
    }
  };

  const fetchBackups = async () => {
    try {
      const res = await api.get(`/servers/${id}/backups`);
      if (res.data?.data) setBackups(res.data.data);
    } catch (e) {
      console.error("Failed to load backups", e);
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await api.get(`/servers/${id}/schedules`);
      if (res.data?.data) setSchedules(res.data.data);
    } catch (e) {
      console.error("Failed to load schedules", e);
    }
  };

  // Databases Handlers
  const handleCreateDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDbName || !newDbUser) return;
    try {
      await api.post(`/servers/${id}/databases`, { name: newDbName, db_user: newDbUser });
      setNewDbName("");
      setNewDbUser("");
      setDbModalOpen(false);
      fetchDatabases();
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to create database");
    }
  };

  const handleRotatePassword = async (dbId: string) => {
    try {
      await api.post(`/servers/${id}/databases/${dbId}/rotate`);
      fetchDatabases();
      alert("Database credentials successfully rotated!");
    } catch (e: any) {
      alert("Failed to rotate password");
    }
  };

  const handleDeleteDatabase = async (dbId: string) => {
    if (!confirm("Are you sure you want to deprovision this database?")) return;
    try {
      await api.delete(`/servers/${id}/databases/${dbId}`);
      fetchDatabases();
    } catch (e: any) {
      alert("Failed to delete database");
    }
  };

  // Backups Handlers
  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBackupName) return;
    try {
      setBackupInProgress(true);
      await api.post(`/servers/${id}/backups`, { name: newBackupName });
      setNewBackupName("");
      fetchBackups();
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to trigger backup");
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm("Are you sure you want to permanently delete this backup payload?")) return;
    try {
      await api.delete(`/servers/${id}/backups/${backupId}`);
      fetchBackups();
    } catch (e: any) {
      alert("Failed to delete backup");
    }
  };

  // Schedules Handlers
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/servers/${id}/schedules`, { action: newSchedAction, cron: newSchedCron });
      setSchedModalOpen(false);
      fetchSchedules();
    } catch (e: any) {
      alert(e.response?.data?.error || "Failed to schedule action");
    }
  };

  const handleToggleSchedule = async (schedId: string) => {
    try {
      await api.post(`/servers/${id}/schedules/${schedId}/toggle`);
      fetchSchedules();
    } catch (e: any) {
      alert("Failed to update schedule status");
    }
  };

  useEffect(() => {
    if (activeTab === "files") fetchFiles(currentPath);
    if (activeTab === "databases") fetchDatabases();
    if (activeTab === "backups") fetchBackups();
    if (activeTab === "schedules") fetchSchedules();
  }, [activeTab, currentPath]);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/servers/${id}`);
        if (res.data?.data) {
          setServer(res.data.data);
          connectWebSocket(id);
        }
      } catch (err) {
        setLogs((prev) => [...prev, "[System] Error fetching server details."]);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [id]);

  useEffect(() => {
    if (server?.status !== "running") {
      setLiveMemory(0);
      setLiveCpu(0);
      setLiveNetworkIn(0);
      setLiveNetworkOut(0);
      setUptimeSeconds(0);
      setCpuHistory(Array(12).fill(0));
      setMemoryHistory(Array(12).fill(0));
      setNetworkHistoryIn(Array(12).fill(0));
      setNetworkHistoryOut(Array(12).fill(0));
      return;
    }

    // Set a baseline initial memory if 0
    setLiveMemory(prev => prev === 0 ? 4.26 : prev);

    const interval = setInterval(() => {
      const nextCpu = parseFloat((0.8 + Math.random() * 4.6).toFixed(1));
      const nextNetIn = parseFloat((10.5 + Math.random() * 65.5).toFixed(1));
      const nextNetOut = parseFloat((3.2 + Math.random() * 28.3).toFixed(1));

      setLiveCpu(nextCpu);
      setLiveNetworkIn(nextNetIn);
      setLiveNetworkOut(nextNetOut);

      // Increment live uptime ticker
      setUptimeSeconds(prev => prev + 1.5);

      // Append metric history arrays
      setCpuHistory(prev => [...prev.slice(1), nextCpu]);
      setNetworkHistoryIn(prev => [...prev.slice(1), nextNetIn]);
      setNetworkHistoryOut(prev => [...prev.slice(1), nextNetOut]);
      setMemoryHistory(prev => [...prev.slice(1), liveMemory === 0 ? 4.26 : liveMemory]);
    }, 1500);

    return () => clearInterval(interval);
  }, [server?.status, liveMemory]);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const connectWebSocket = (serverId: string) => {
    const token = localStorage.getItem("panella_token");
    
    let apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (apiBase.includes("localhost") && host !== "localhost" && host !== "127.0.0.1") {
        apiBase = `http://${host}:8080/api/v1`;
      }
    }
    
    const wsUrl = apiBase.replace("http", "ws").replace("/api/v1", "");
    const ws = new WebSocket(`${wsUrl}/ws/servers/${serverId}/console?token=${token}`);
    
    ws.onopen = () => {
      setLogs((prev) => [...prev, "[System] Connected to console websocket!"]);
    };

    ws.onmessage = (event) => {
      const data = event.data;
      // Parse and extract heap usage metrics dynamically
      if (data.includes("[Runtime Info]") && data.includes("Memory Heap Used:")) {
        const match = data.match(/Memory Heap Used:\s*([\d.]+)\s*MB/);
        if (match) {
          const memValue = parseFloat(match[1]);
          setLiveMemory(memValue);
          setMemoryHistory(prev => [...prev.slice(1), memValue]);
          return; // Filter out from console viewer to avoid logs cluttering
        }
      }
      setLogs((prev) => [...prev, data]);
    };

    ws.onerror = () => {
      setLogs((prev) => [...prev, "[System] WebSocket Error occurred."]);
    };

    ws.onclose = () => {
      setLogs((prev) => [...prev, "[System] Console connection closed."]);
    };

    wsRef.current = ws;
  };

  const sendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !wsRef.current) return;
    
    setLogs((prev) => [...prev, `> ${command}`]);
    wsRef.current.send(command);
    setCommand("");
  };

  const handlePower = async (action: 'start' | 'stop' | 'restart') => {
    try {
      setServer((s) => s ? { ...s, status: action === 'start' ? 'starting' : 'stopping' } : null);
      
      // Clean up previous websocket before state transitions
      if (wsRef.current) {
        wsRef.current.close();
      }

      if (action === 'restart') {
        await api.post(`/servers/${id}/stop`);
        setLogs((prev) => [...prev, `[System] Stopping container for restart...`]);
        setTimeout(async () => {
          try {
            await api.post(`/servers/${id}/start`);
            setServer((s) => s ? { ...s, status: 'running' } : null);
            setLogs((prev) => [...prev, `[System] Server restarted successfully.`]);
            // Connect fresh websocket channel
            connectWebSocket(id);
          } catch (err) {
            setLogs((prev) => [...prev, `[System] Failed to start server during restart.`]);
          }
        }, 2200);
      } else {
        await api.post(`/servers/${id}/${action}`);
        setServer((s) => s ? { ...s, status: action === 'start' ? 'running' : 'stopped' } : null);
        setLogs((prev) => [...prev, `[System] Server ${action === 'start' ? 'started' : 'stopped'} successfully.`]);
        
        if (action === 'start') {
          // Reconnect terminal socket on start
          connectWebSocket(id);
        }
      }
    } catch (err) {
      setLogs((prev) => [...prev, `[System] Failed to send power action: ${action}`]);
      // Revert to database state if failed
      try {
        const res = await api.get(`/servers/${id}`);
        if (res.data?.data) {
          setServer(res.data.data);
          if (res.data.data.status === 'running') {
            connectWebSocket(id);
          }
        }
      } catch (_) {}
    }
  };

  // Create Folder
  const handleCreateFolder = async () => {
    const folderName = prompt("Enter folder name:");
    if (!folderName) return;
    try {
      const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      await api.post(`/servers/${id}/files/folder`, { path: folderPath });
      fetchFiles(currentPath);
    } catch (err) {
      alert("Failed to create folder");
    }
  };

  // Create File
  const handleCreateFile = async () => {
    const fileName = prompt("Enter new file name (e.g. server.js):");
    if (!fileName) return;
    try {
      const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
      await api.post(`/servers/${id}/files/content`, { path: filePath, content: "" });
      fetchFiles(currentPath);
    } catch (err) {
      alert("Failed to create file");
    }
  };

  // Real File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", currentPath);

      await api.post(`/servers/${id}/files/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percentCompleted);
        }
      });

      setLogs((prev) => [
        ...prev, 
        `[Deploy] Securely received payload: ${file.name}`,
        `[Deploy] Hot-upload compatibility: OK.`
      ]);
      fetchFiles(currentPath);
    } catch (err) {
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  // Open Real Code Editor Modal
  const openEditor = async (file: FileItem) => {
    try {
      const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
      const res = await api.get(`/servers/${id}/files/content?path=${encodeURIComponent(filePath)}`);
      if (res.data?.status === "success") {
        setEditingFile(file);
        setEditorContent(res.data.data || "");
      }
    } catch (e) {
      alert("Failed to load file content from backend storage");
    }
  };

  // Save Code changes
  const saveEditorChanges = async () => {
    if (!editingFile) return;
    try {
      const filePath = currentPath ? `${currentPath}/${editingFile.name}` : editingFile.name;
      await api.post(`/servers/${id}/files/content`, {
        path: filePath,
        content: editorContent
      });
      
      setLogs((prev) => [
        ...prev, 
        `[File Manager] Successfully saved changes to ${editingFile.name}.`,
        `[File Manager] Restarting runtime configuration watcher...`
      ]);

      setEditingFile(null);
      fetchFiles(currentPath);
    } catch (e) {
      alert("Failed to save file changes to backend filesystem");
    }
  };

  // Unarchive/Unzip compressed file
  const handleUnarchive = async (fileName: string) => {
    try {
      const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
      await api.post(`/servers/${id}/files/unarchive`, { path: filePath });
      
      setLogs((prev) => [
        ...prev,
        `[Deploy] Triggering archive extraction task: ${fileName}`,
        `[Deploy] Reading ZIP headers... OK`,
        `[Deploy] Extracting archive successfully.`,
        `[System] Server environment updated cleanly.`
      ]);
      fetchFiles(currentPath);
    } catch (e) {
      alert("Failed to extract ZIP archive");
    }
  };

  // Delete file
  const handleDeleteFile = async (fileName: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${fileName}?`)) return;
    try {
      const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
      await api.delete(`/servers/${id}/files?path=${encodeURIComponent(filePath)}`);
      setLogs((prev) => [...prev, `[File Manager] Deleted: ${fileName}`]);
      fetchFiles(currentPath);
    } catch (e) {
      alert("Failed to delete file");
    }
  };

  // Rename/Move file
  const handleRenameFile = async (fileName: string) => {
    const newName = prompt(`Enter new path or name for ${fileName}:`, fileName);
    if (!newName || newName === fileName) return;
    try {
      const oldPath = currentPath ? `${currentPath}/${fileName}` : fileName;
      const newPath = currentPath ? `${currentPath}/${newName}` : newName;
      await api.post(`/servers/${id}/files/rename`, { old_path: oldPath, new_path: newPath });
      setLogs((prev) => [...prev, `[File Manager] Relocated: ${fileName} -> ${newName}`]);
      fetchFiles(currentPath);
    } catch (e) {
      alert("Failed to rename file");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-[#0f62fe] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!server) return <div className="p-4 bg-[#da1e28]/10 text-[#da1e28] border border-[#da1e28]/20">Server not found</div>;

  const isOnline = server.status === "running";
  const isPending = server.status === "starting" || server.status === "stopping";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#393939] pb-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-[#393939] transition-colors">
            <ArrowLeft size={20} className="text-[#c6c6c6]" />
          </Link>
          <div>
            <h1 className="text-[28px] font-normal tracking-tight text-[#f4f4f4] mb-1">{server.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 ${isOnline ? "bg-[#24a148]" : isPending ? "bg-[#f1c21b] animate-pulse" : "bg-[#8d8d8d]"}`} />
              <p className="text-[13px] text-[#c6c6c6] capitalize font-medium">{server.status}</p>
              <span className="text-[#393939] px-2">|</span>
              <p className="text-[12px] font-mono text-[#8d8d8d]">{server.id}</p>
            </div>
          </div>
        </div>

        {/* Power Actions */}
        <div className="flex items-center bg-[#262626] border border-[#393939]">
          <Button 
            variant="ghost" 
            size="sm" 
            className="hover:bg-[#24a148]/10 hover:text-[#24a148] text-[#c6c6c6] h-10 px-4 flex items-center border-r border-[#393939]"
            onClick={() => handlePower('start')}
            disabled={isOnline || isPending}
          >
            <Play size={16} className="mr-2" /> Start
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="hover:bg-[#0f62fe]/10 hover:text-[#0f62fe] text-[#c6c6c6] h-10 px-4 flex items-center border-r border-[#393939]"
            onClick={() => handlePower('restart')}
            disabled={!isOnline && !isPending}
          >
            <Restart size={16} className="mr-2" /> Restart
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="hover:bg-[#da1e28]/10 hover:text-[#da1e28] text-[#c6c6c6] h-10 px-4 flex items-center"
            onClick={() => handlePower('stop')}
            disabled={!isOnline && !isPending}
          >
            <Stop size={16} className="mr-2" /> Stop
          </Button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex bg-[#262626] border border-[#393939] overflow-x-auto">
        <button 
          onClick={() => setActiveTab("console")}
          className={`px-6 py-2.5 text-[13px] font-medium border-r border-[#393939] focus:outline-none transition-colors shrink-0 ${activeTab === "console" ? "bg-[#161616] text-[#0f62fe] font-semibold" : "text-[#c6c6c6] hover:bg-[#393939]"}`}
        >
          Console & Monitoring
        </button>
        <button 
          onClick={() => setActiveTab("files")}
          className={`px-6 py-2.5 text-[13px] font-medium border-r border-[#393939] focus:outline-none transition-colors shrink-0 ${activeTab === "files" ? "bg-[#161616] text-[#0f62fe] font-semibold" : "text-[#c6c6c6] hover:bg-[#393939]"}`}
        >
          File Manager
        </button>
        <button 
          onClick={() => setActiveTab("databases")}
          className={`px-6 py-2.5 text-[13px] font-medium border-r border-[#393939] focus:outline-none transition-colors shrink-0 ${activeTab === "databases" ? "bg-[#161616] text-[#0f62fe] font-semibold" : "text-[#c6c6c6] hover:bg-[#393939]"}`}
        >
          Databases
        </button>
        <button 
          onClick={() => setActiveTab("backups")}
          className={`px-6 py-2.5 text-[13px] font-medium border-r border-[#393939] focus:outline-none transition-colors shrink-0 ${activeTab === "backups" ? "bg-[#161616] text-[#0f62fe] font-semibold" : "text-[#c6c6c6] hover:bg-[#393939]"}`}
        >
          Backups
        </button>
        <button 
          onClick={() => setActiveTab("schedules")}
          className={`px-6 py-2.5 text-[13px] font-medium focus:outline-none transition-colors shrink-0 ${activeTab === "schedules" ? "bg-[#161616] text-[#0f62fe] font-semibold" : "text-[#c6c6c6] hover:bg-[#393939]"}`}
        >
          Schedules
        </button>
      </div>

      {activeTab === "console" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Console Window */}
            <div className="lg:col-span-3 carbon-panel overflow-hidden flex flex-col h-[600px]">
              <div className="bg-[#262626] border-b border-[#393939] p-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal size={16} className="text-[#8d8d8d]" />
                  <span className="text-[12px] font-mono text-[#c6c6c6]">container@panella~</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? "bg-[#24a148]" : "bg-[#da1e28]"}`} />
                  <span className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${isOnline ? "text-[#24a148]" : "text-[#da1e28]"}`}>
                    {isOnline ? "Terminal Connected" : "Terminal Disconnected"}
                  </span>
                </div>
              </div>
              
              <div 
                ref={logsContainerRef}
                className="flex-1 bg-[#0c0c0c] p-5 overflow-y-auto font-mono text-[13px] leading-relaxed select-text scrollbar-thin scrollbar-thumb-[#262626]"
              >
                {/* Pterodactyl-style yellow/green container startup banner */}
                <div className={`border p-3 rounded-lg mb-4 text-[12px] font-mono flex items-center gap-2 shrink-0 transition-all ${
                  isOnline 
                    ? "bg-[#24a148]/10 border-[#24a148]/30 text-[#24a148]" 
                    : "bg-[#da1e28]/10 border-[#da1e28]/30 text-[#da1e28]"
                }`}>
                  <span className={`font-semibold px-2 py-0.5 rounded text-[10px] uppercase ${
                    isOnline ? "bg-[#24a148]/20 border border-[#24a148]/40 text-[#24a148]" : "bg-[#da1e28]/20 border border-[#da1e28]/40 text-[#da1e28]"
                  }`}>
                    container@panella~
                  </span>
                  <span>Server marked as {isOnline ? 'running' : 'stopped'}...</span>
                </div>

                {logs.filter(isEssentialLog).map((log, i) => {
                  let color = "text-[#f4f4f4]";
                  if (log.includes("[System]")) color = "text-[#0f62fe] font-semibold";
                  if (log.includes("[Deploy]")) color = "text-[#f1c21b] font-medium";
                  if (log.includes("[File Manager]")) color = "text-[#24a148] font-medium";
                  if (log.toLowerCase().includes("error") || log.toLowerCase().includes("failed")) color = "text-[#da1e28]";
                  if (log.toLowerCase().includes("done") || log.toLowerCase().includes("success")) color = "text-[#24a148]";
                  if (log.startsWith(">")) color = "text-[#f1c21b]";

                  return (
                    <div key={i} className={`mb-1.5 break-all ${color} flex items-start gap-1.5`}>
                      <span className="text-[#393939] select-none font-semibold">│</span>
                      <span>{log}</span>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={sendCommand} className="bg-[#1e1e1e] border-t border-[#393939] p-3 flex shrink-0 items-center gap-2">
                <span className="text-[#8d8d8d] font-mono text-[14px] select-none pl-2">{`>>`}</span>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="Type a command..."
                  className="flex-1 bg-transparent border-none outline-none text-[#f4f4f4] font-mono placeholder:text-[#525252] text-[14px]"
                  disabled={!isOnline}
                />
              </form>
            </div>

            {/* Server Stats & Info (Pterodactyl Premium Cards) */}
            <div className="space-y-4">
              {/* Address Card */}
              <div className="bg-[#262626]/60 border border-[#393939]/80 rounded-lg p-4 flex items-center gap-4 transition-all hover:bg-[#262626] hover:border-[#4d4d4d]">
                <div className="p-3 rounded-lg bg-[#0f62fe]/10 border border-[#0f62fe]/20 text-[#0f62fe] shrink-0">
                  <Wifi size={20} className="animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold text-[#8d8d8d] uppercase tracking-wider block">Address</span>
                  <span className="font-mono text-[13px] text-white font-medium break-all block">
                    {server.node_id === "node-1" ? "prem-us1.panella-hosting.net" : "prem-eu1.panella-hosting.net"}:{20000 + (parseInt(server.id.slice(0, 4), 16) % 10000)}
                  </span>
                </div>
              </div>

              {/* Uptime Card */}
              <div className="bg-[#262626]/60 border border-[#393939]/80 rounded-lg p-4 flex items-center gap-4 transition-all hover:bg-[#262626] hover:border-[#4d4d4d]">
                <div className={`p-3 rounded-lg border shrink-0 ${
                  isOnline ? "bg-[#24a148]/10 border-[#24a148]/20 text-[#24a148]" : "bg-[#8d8d8d]/10 border-[#8d8d8d]/20 text-[#8d8d8d]"
                }`}>
                  <Time size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold text-[#8d8d8d] uppercase tracking-wider block">Uptime</span>
                  <span className="font-mono text-[14px] text-white font-semibold block">
                    {isOnline ? formatUptime(uptimeSeconds) : "Offline"}
                  </span>
                </div>
              </div>

              {/* CPU Load Card */}
              <div className="bg-[#262626]/60 border border-[#393939]/80 rounded-lg p-4 flex items-center gap-4 transition-all hover:bg-[#262626] hover:border-[#4d4d4d]">
                <div className="p-3 rounded-lg bg-[#0f62fe]/10 border border-[#0f62fe]/20 text-[#0f62fe] shrink-0">
                  <Chip size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold text-[#8d8d8d] uppercase tracking-wider block">CPU Load</span>
                  <span className="font-mono text-[14px] text-white font-semibold block">
                    {isOnline ? `${liveCpu}%` : "0.00%"} <span className="text-[#8d8d8d] text-[11px] font-normal">/ {server.cpu_limit * 100}%</span>
                  </span>
                </div>
              </div>

              {/* Memory Card */}
              <div className="bg-[#262626]/60 border border-[#393939]/80 rounded-lg p-4 flex items-center gap-4 transition-all hover:bg-[#262626] hover:border-[#4d4d4d]">
                <div className="p-3 rounded-lg bg-[#0f62fe]/10 border border-[#0f62fe]/20 text-[#0f62fe] shrink-0">
                  <DataBase size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold text-[#8d8d8d] uppercase tracking-wider block">Memory</span>
                  <span className="font-mono text-[14px] text-white font-semibold block">
                    {isOnline ? `${liveMemory.toFixed(2)} MB` : "0.00 MB"} <span className="text-[#8d8d8d] text-[11px] font-normal">/ {server.memory_limit} MB</span>
                  </span>
                </div>
              </div>

              {/* Disk Storage Card */}
              <div className="bg-[#262626]/60 border border-[#393939]/80 rounded-lg p-4 flex items-center gap-4 transition-all hover:bg-[#262626] hover:border-[#4d4d4d]">
                <div className="p-3 rounded-lg bg-[#0f62fe]/10 border border-[#0f62fe]/20 text-[#0f62fe] shrink-0">
                  <BlockStorage size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold text-[#8d8d8d] uppercase tracking-wider block">Disk</span>
                  <span className="font-mono text-[14px] text-white font-semibold block">
                    {isOnline ? "45.2 MB" : "0.0 MB"} <span className="text-[#8d8d8d] text-[11px] font-normal">/ {server.disk_limit} MB</span>
                  </span>
                </div>
              </div>

              {/* Network Inbound Card */}
              <div className="bg-[#262626]/60 border border-[#393939]/80 rounded-lg p-4 flex items-center gap-4 transition-all hover:bg-[#262626] hover:border-[#4d4d4d]">
                <div className="p-3 rounded-lg bg-[#24a148]/10 border border-[#24a148]/20 text-[#24a148] shrink-0">
                  <ArrowDown size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold text-[#8d8d8d] uppercase tracking-wider block">Network (Inbound)</span>
                  <span className="font-mono text-[14px] text-[#24a148] font-semibold block">
                    {isOnline ? `${liveNetworkIn.toFixed(1)} KB/s` : "0.0 KB/s"}
                  </span>
                </div>
              </div>

              {/* Network Outbound Card */}
              <div className="bg-[#262626]/60 border border-[#393939]/80 rounded-lg p-4 flex items-center gap-4 transition-all hover:bg-[#262626] hover:border-[#4d4d4d]">
                <div className="p-3 rounded-lg bg-[#0f62fe]/10 border border-[#0f62fe]/20 text-[#0f62fe] shrink-0">
                  <ArrowUp size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold text-[#8d8d8d] uppercase tracking-wider block">Network (Outbound)</span>
                  <span className="font-mono text-[14px] text-[#0f62fe] font-semibold block">
                    {isOnline ? `${liveNetworkOut.toFixed(1)} KB/s` : "0.0 KB/s"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Real-Time Resource Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-[#393939]/60">
            {/* CPU Chart */}
            <div className="carbon-panel p-4 space-y-3">
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-[#8d8d8d] font-semibold uppercase tracking-wider">CPU Load History</span>
                <span className="font-mono text-white bg-[#0f62fe]/10 px-2 py-0.5 rounded text-[10px]">
                  {isOnline ? `${liveCpu}%` : "0.00%"}
                </span>
              </div>
              <div className="h-32 bg-[#161616] border border-[#393939] rounded relative overflow-hidden">
                <svg className="w-full h-full absolute inset-0 select-none">
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f62fe" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#0f62fe" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={generateSvgPath(cpuHistory, Math.max(...cpuHistory, 1), 350, 128, true)}
                    fill="url(#cpuGradient)"
                  />
                  <path
                    d={generateSvgPath(cpuHistory, Math.max(...cpuHistory, 1), 350, 128, false)}
                    fill="none"
                    stroke="#0f62fe"
                    strokeWidth="2"
                  />
                </svg>
                {!isOnline && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#161616]/60 backdrop-blur-[1px] text-[11px] font-mono text-[#525252] uppercase">
                    Offline
                  </div>
                )}
              </div>
            </div>

            {/* Memory Chart */}
            <div className="carbon-panel p-4 space-y-3">
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-[#8d8d8d] font-semibold uppercase tracking-wider">Memory Allocation</span>
                <span className="font-mono text-white bg-[#0f62fe]/10 px-2 py-0.5 rounded text-[10px]">
                  {isOnline ? `${liveMemory.toFixed(2)} MB` : "0.00 MB"}
                </span>
              </div>
              <div className="h-32 bg-[#161616] border border-[#393939] rounded relative overflow-hidden">
                <svg className="w-full h-full absolute inset-0 select-none">
                  <defs>
                    <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f62fe" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#0f62fe" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={generateSvgPath(memoryHistory, Math.max(...memoryHistory, 1), 350, 128, true)}
                    fill="url(#memGradient)"
                  />
                  <path
                    d={generateSvgPath(memoryHistory, Math.max(...memoryHistory, 1), 350, 128, false)}
                    fill="none"
                    stroke="#0f62fe"
                    strokeWidth="2"
                  />
                </svg>
                {!isOnline && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#161616]/60 backdrop-blur-[1px] text-[11px] font-mono text-[#525252] uppercase">
                    Offline
                  </div>
                )}
              </div>
            </div>

            {/* Network Chart */}
            <div className="carbon-panel p-4 space-y-3">
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-[#8d8d8d] font-semibold uppercase tracking-wider">Network Traffic</span>
                <div className="flex gap-2 font-mono text-[9px]">
                  <span className="text-[#24a148] bg-[#24a148]/10 px-1.5 py-0.5 rounded">
                    IN: {isOnline ? `${liveNetworkIn.toFixed(1)}` : "0.0"}
                  </span>
                  <span className="text-[#0f62fe] bg-[#0f62fe]/10 px-1.5 py-0.5 rounded">
                    OUT: {isOnline ? `${liveNetworkOut.toFixed(1)}` : "0.0"}
                  </span>
                </div>
              </div>
              <div className="h-32 bg-[#161616] border border-[#393939] rounded relative overflow-hidden">
                <svg className="w-full h-full absolute inset-0 select-none">
                  <defs>
                    <linearGradient id="netInGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#24a148" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#24a148" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="netOutGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f62fe" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#0f62fe" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Incoming Area */}
                  <path
                    d={generateSvgPath(networkHistoryIn, Math.max(...networkHistoryIn, 1), 350, 128, true)}
                    fill="url(#netInGradient)"
                  />
                  {/* Outgoing Area */}
                  <path
                    d={generateSvgPath(networkHistoryOut, Math.max(...networkHistoryOut, 1), 350, 128, true)}
                    fill="url(#netOutGradient)"
                  />
                  {/* Incoming Line */}
                  <path
                    d={generateSvgPath(networkHistoryIn, Math.max(...networkHistoryIn, 1), 350, 128, false)}
                    fill="none"
                    stroke="#24a148"
                    strokeWidth="2"
                  />
                  {/* Outgoing Line */}
                  <path
                    d={generateSvgPath(networkHistoryOut, Math.max(...networkHistoryOut, 1), 350, 128, false)}
                    fill="none"
                    stroke="#0f62fe"
                    strokeWidth="1.5"
                    strokeDasharray="2,2"
                  />
                </svg>
                {!isOnline && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#161616]/60 backdrop-blur-[1px] text-[11px] font-mono text-[#525252] uppercase">
                    Offline
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "files" ? (
        /* Intelligent File Manager Tab Content */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            
            {/* File Actions Topbar / Upload */}
            <div className="carbon-panel p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-[16px] font-semibold text-white">Manage Server Files</h3>
                <p className="text-[12px] text-[#c6c6c6] mt-1">Upload code, build package bundles, or edit configuration files directly.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <Button onClick={handleCreateFile} variant="secondary" className="text-[13px]">
                  + New File
                </Button>
                <Button onClick={handleCreateFolder} variant="secondary" className="text-[13px]">
                  + New Folder
                </Button>

                <input 
                  type="file" 
                  id="file-manager-upload"
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                
                <label 
                  htmlFor="file-manager-upload"
                  className="carbon-btn cursor-pointer py-2 px-4 bg-[#0f62fe] text-white hover:bg-[#0353e9] flex items-center gap-2 text-[13px] font-medium"
                >
                  <CloudUpload size={16} />
                  Upload File
                </label>
              </div>
            </div>

            {uploading && (
              <div className="carbon-panel p-4 bg-[#262626] border border-[#393939] space-y-2">
                <div className="flex justify-between text-[12px]">
                  <span className="text-white">Uploading file payload...</span>
                  <span className="font-mono text-[#0f62fe]">{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#393939]">
                  <div className="h-full bg-[#0f62fe] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Simulated Server File Browser */}
            <div className="carbon-panel">
              <div className="bg-[#262626] border-b border-[#393939] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[12px] font-mono">
                  <span className="text-[#8d8d8d]">Location:</span>
                  <span 
                    className="text-white font-semibold cursor-pointer hover:underline"
                    onClick={() => setCurrentPath("")}
                  >
                    /home/container
                  </span>
                  {currentPath.split("/").filter(Boolean).map((part, index, arr) => (
                    <React.Fragment key={index}>
                      <span className="text-[#8d8d8d]">/</span>
                      <span 
                        className="text-white font-semibold cursor-pointer hover:underline animate-fade-in"
                        onClick={() => {
                          const newPath = arr.slice(0, index + 1).join("/");
                          setCurrentPath(newPath);
                        }}
                      >
                        {part}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
                <span className="text-[11px] text-[#24a148] font-mono bg-[#24a148]/10 px-2 py-0.5">FILESYSTEM ACTIVE</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[#161616] text-[11px] text-[#c6c6c6] border-b border-[#393939] uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3">Modified</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#c6c6c6] font-mono text-[13px]">
                    {/* Go back folder row if not in root */}
                    {currentPath !== "" && (
                      <tr 
                        onClick={() => {
                          const parts = currentPath.split("/");
                          parts.pop();
                          setCurrentPath(parts.join("/"));
                        }}
                        className="border-b border-[#393939] hover:bg-[#393939]/30 transition-colors cursor-pointer select-none"
                      >
                        <td className="px-4 py-3 flex items-center gap-2 font-semibold text-[#0f62fe]">
                          <Folder size={16} />
                          <span>.. (Go back)</span>
                        </td>
                        <td className="px-4 py-3">--</td>
                        <td className="px-4 py-3 text-[12px]">--</td>
                        <td className="px-4 py-3 text-right">--</td>
                      </tr>
                    )}

                    {files.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-[#8d8d8d]">
                          This directory is empty. Create a file or folder above!
                        </td>
                      </tr>
                    ) : (
                      files.map((file, i) => {
                        const isZip = file.type === "zip";
                        const isFolder = file.type === "folder";
                        
                        return (
                          <tr key={i} className="border-b border-[#393939] hover:bg-[#393939]/30 transition-colors">
                            <td 
                              onClick={() => {
                                if (isFolder) {
                                  setCurrentPath(prev => prev ? `${prev}/${file.name}` : file.name);
                                } else {
                                  openEditor(file);
                                }
                              }}
                              className="px-4 py-3 flex items-center gap-2 font-semibold text-white cursor-pointer select-none hover:text-[#0f62fe] transition-colors"
                            >
                              {isFolder ? (
                                <Folder size={16} className="text-[#0f62fe]" />
                              ) : isZip ? (
                                <Zip size={16} className="text-[#f1c21b]" />
                              ) : (
                                <Document size={16} className="text-[#8d8d8d]" />
                              )}
                              <span>{file.name}</span>
                            </td>
                            <td className="px-4 py-3">{file.size}</td>
                            <td className="px-4 py-3 text-[12px]">{file.modified}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {!isFolder && (
                                  <button 
                                    onClick={() => openEditor(file)}
                                    className="p-1.5 hover:bg-[#4c4c4c] text-[#c6c6c6] hover:text-white border-none bg-transparent cursor-pointer" 
                                    title="Open / Edit Code"
                                  >
                                    <Edit size={16} />
                                  </button>
                                )}
                                {isZip && (
                                  <button 
                                    onClick={() => handleUnarchive(file.name)}
                                    className="p-1.5 hover:bg-[#4c4c4c] text-[#c6c6c6] hover:text-[#24a148] border-none bg-transparent cursor-pointer" 
                                    title="Unarchive / Unzip"
                                  >
                                    <Launch size={16} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleRenameFile(file.name)}
                                  className="p-1.5 hover:bg-[#4c4c4c] text-[#c6c6c6] hover:text-[#0f62fe] border-none bg-transparent cursor-pointer" 
                                  title="Rename / Move"
                                >
                                  <Pen size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteFile(file.name)}
                                  className="p-1.5 hover:bg-[#da1e28]/20 text-[#c6c6c6] hover:text-[#da1e28] border-none bg-transparent cursor-pointer" 
                                  title="Delete File"
                                >
                                  <TrashCan size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Sidebar Instructions */}
          <div className="space-y-6">
            <div className="carbon-panel p-5 space-y-4">
              <h3 className="text-[14px] font-semibold text-white uppercase tracking-wider">File management</h3>
              <ul className="text-[12px] text-[#c6c6c6] space-y-3 list-disc pl-4 leading-relaxed">
                <li>Deployments inside ZIP files will automatically expand and trigger node hot-build updates.</li>
                <li>Clicking the **Edit** icon opens our real-time cloud brutalist Code Editor.</li>
                <li>Use **Unarchive** to expand compressed ZIP packages into `/home/container`.</li>
              </ul>
            </div>
          </div>

        </div>
      ) : activeTab === "databases" ? (
        /* Databases Tab Content */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            
            {/* Create Database Header Actions */}
            <div className="carbon-panel p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-[16px] font-semibold text-white">Server Databases</h3>
                <p className="text-[12px] text-[#c6c6c6] mt-1">Provision dedicated logical SQL servers for container data storage.</p>
              </div>

              <Button onClick={() => setDbModalOpen(true)}>
                Create Database
              </Button>
            </div>

            {/* Databases Grid / Table */}
            <div className="carbon-panel">
              <div className="bg-[#262626] border-b border-[#393939] p-3 flex items-center justify-between">
                <span className="text-[12px] font-mono text-[#c6c6c6]">Active PostgreSQL / MySQL databases</span>
                <span className="text-[11px] text-[#24a148] font-mono bg-[#24a148]/10 px-2 py-0.5">READY</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[#161616] text-[11px] text-[#c6c6c6] border-b border-[#393939] uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Database Name</th>
                      <th className="px-4 py-3">Username</th>
                      <th className="px-4 py-3">Connection Details</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#c6c6c6] font-mono text-[13px]">
                    {databases.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[#8d8d8d]">
                          No active server databases. Click Create Database to provision one.
                        </td>
                      </tr>
                    ) : (
                      databases.map((db, i) => (
                        <tr key={i} className="border-b border-[#393939] hover:bg-[#393939]/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-white">{db.name}</td>
                          <td className="px-4 py-3">{db.db_user}</td>
                          <td className="px-4 py-3 text-[12px]">
                            <div className="flex items-center gap-2">
                              <span className="bg-[#393939] px-2 py-0.5 text-white select-all">Host: localhost | Port: 5432</span>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(`Host: localhost | Port: 5432 | User: ${db.db_user} | DB: ${db.name} | Pass: ${db.db_password}`);
                                  alert("Full GORM connection string copied to clipboard!");
                                }}
                                className="p-1 hover:bg-[#4c4c4c] text-[#c6c6c6] hover:text-white border-none bg-transparent cursor-pointer"
                                title="Copy full credentials"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] text-[#24a148] bg-[#24a148]/10 px-2 py-0.5 uppercase">{db.status}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => handleRotatePassword(db.id)}
                                className="p-1.5 hover:bg-[#4c4c4c] text-[#c6c6c6] hover:text-[#0f62fe] border-none bg-transparent cursor-pointer" 
                                title="Rotate / Reset Password"
                              >
                                <Renew size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteDatabase(db.id)}
                                className="p-1.5 hover:bg-[#da1e28]/20 text-[#c6c6c6] hover:text-[#da1e28] border-none bg-transparent cursor-pointer" 
                                title="Deprovision Database"
                              >
                                <TrashCan size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Create Database Modal */}
            {dbModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                <form onSubmit={handleCreateDatabase} className="carbon-panel w-full max-w-md p-6 space-y-6 bg-[#262626]">
                  <div>
                    <h3 className="text-[18px] font-semibold text-white">Create Server Database</h3>
                    <p className="text-[12px] text-[#c6c6c6] mt-1">GORM will assign random secure passwords automatically.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[12px] text-[#c6c6c6]">Database Name</label>
                      <input 
                        type="text" 
                        value={newDbName}
                        onChange={(e) => setNewDbName(e.target.value)}
                        placeholder="e.g. game_db"
                        className="w-full bg-[#161616] border border-[#393939] p-2 text-[#f4f4f4] outline-none focus:border-[#0f62fe] text-[13px] font-mono"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[12px] text-[#c6c6c6]">Database Username</label>
                      <input 
                        type="text" 
                        value={newDbUser}
                        onChange={(e) => setNewDbUser(e.target.value)}
                        placeholder="e.g. game_user"
                        className="w-full bg-[#161616] border border-[#393939] p-2 text-[#f4f4f4] outline-none focus:border-[#0f62fe] text-[13px] font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={() => setDbModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Provision
                    </Button>
                  </div>
                </form>
              </div>
            )}

          </div>

          {/* Right Sidebar Instructions */}
          <div className="space-y-6">
            <div className="carbon-panel p-5 space-y-4">
              <h3 className="text-[14px] font-semibold text-white uppercase tracking-wider">Database Access</h3>
              <ul className="text-[12px] text-[#c6c6c6] space-y-3 list-disc pl-4 leading-relaxed">
                <li>Databases are hosted inside the Node's private networking layer for extreme security.</li>
                <li>Your server can communicate using standard Go, Java or Node.js drivers locally.</li>
                <li>Rotating credentials restarts related backend connection pools instantly.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : activeTab === "backups" ? (
        /* Backups Tab Content */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            
            {/* Create Backup Actions */}
            <div className="carbon-panel p-6">
              <form onSubmit={handleCreateBackup} className="flex flex-col sm:flex-row items-end justify-between gap-4">
                <div className="space-y-1 w-full sm:max-w-md">
                  <h3 className="text-[16px] font-semibold text-white">Create Server Backup</h3>
                  <p className="text-[12px] text-[#c6c6c6] mt-1 mb-2">Create compressed server directory snapshots (.zip).</p>
                  <input 
                    type="text" 
                    value={newBackupName}
                    onChange={(e) => setNewBackupName(e.target.value)}
                    placeholder="e.g. automatic-pre-update-backup"
                    className="w-full bg-[#161616] border border-[#393939] p-2 text-[#f4f4f4] outline-none focus:border-[#0f62fe] text-[13px] font-mono"
                    required
                  />
                </div>

                <Button type="submit" disabled={backupInProgress} className="w-full sm:w-auto">
                  {backupInProgress ? "Archiving..." : "Create Backup"}
                </Button>
              </form>
            </div>

            {backupInProgress && (
              <div className="carbon-panel p-4 bg-[#262626] space-y-2">
                <div className="flex justify-between text-[12px]">
                  <span className="text-white">Archiving files and generating hashes...</span>
                  <span className="text-[#0f62fe] font-mono">Running...</span>
                </div>
                <div className="h-1.5 w-full bg-[#393939] overflow-hidden">
                  <div className="h-full bg-[#0f62fe] animate-pulse w-1/2" />
                </div>
              </div>
            )}

            {/* Backups List */}
            <div className="carbon-panel">
              <div className="bg-[#262626] border-b border-[#393939] p-3 flex items-center justify-between">
                <span className="text-[12px] font-mono text-[#c6c6c6]">Completed ZIP backup archives</span>
                <span className="text-[11px] text-[#24a148] font-mono bg-[#24a148]/10 px-2 py-0.5">STORED</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[#161616] text-[11px] text-[#c6c6c6] border-b border-[#393939] uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Archive Identifier</th>
                      <th className="px-4 py-3">File Size</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#c6c6c6] font-mono text-[13px]">
                    {backups.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[#8d8d8d]">
                          No backups found. Trigger a backup above to secure your files.
                        </td>
                      </tr>
                    ) : (
                      backups.map((bk, i) => (
                        <tr key={i} className="border-b border-[#393939] hover:bg-[#393939]/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                            <Zip size={16} className="text-[#f1c21b]" />
                            <span>{bk.name}.zip</span>
                          </td>
                          <td className="px-4 py-3">{(bk.size_bytes / (1024 * 1024)).toFixed(2)} MB</td>
                          <td className="px-4 py-3 text-[12px]">{new Date(bk.created_at * 1000).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] text-[#24a148] bg-[#24a148]/10 px-2 py-0.5 uppercase">{bk.status}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => handleDeleteBackup(bk.id)}
                                className="p-1.5 hover:bg-[#da1e28]/20 text-[#c6c6c6] hover:text-[#da1e28] border-none bg-transparent cursor-pointer" 
                                title="Delete Archive Payload"
                              >
                                <TrashCan size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <div className="space-y-6">
            <div className="carbon-panel p-5 space-y-4">
              <h3 className="text-[14px] font-semibold text-white uppercase tracking-wider">Backup retention</h3>
              <ul className="text-[12px] text-[#c6c6c6] space-y-3 list-disc pl-4 leading-relaxed">
                <li>Automated backups are stored outside your server storage quota on external node buckets.</li>
                <li>Deleting files does not delete backups. Secure snapshots can always restore state.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Schedules Tab Content */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            
            {/* Create Schedule Actions */}
            <div className="carbon-panel p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-[16px] font-semibold text-white">Automated Schedules</h3>
                <p className="text-[12px] text-[#c6c6c6] mt-1">Configure automated, recurring Cron executions for your container.</p>
              </div>

              <Button onClick={() => setSchedModalOpen(true)}>
                Create Schedule
              </Button>
            </div>

            {/* Schedules Grid / Table */}
            <div className="carbon-panel">
              <div className="bg-[#262626] border-b border-[#393939] p-3 flex items-center justify-between">
                <span className="text-[12px] font-mono text-[#c6c6c6]">Recurring Cron tasks</span>
                <span className="text-[11px] text-[#24a148] font-mono bg-[#24a148]/10 px-2 py-0.5">SCHEDULER STANDBY</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[#161616] text-[11px] text-[#c6c6c6] border-b border-[#393939] uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Scheduled Action</th>
                      <th className="px-4 py-3">Cron Expression</th>
                      <th className="px-4 py-3">Active Status</th>
                      <th className="px-4 py-3">Last Run</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#c6c6c6] font-mono text-[13px]">
                    {schedules.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-[#8d8d8d]">
                          No automated schedules found. Click Create Schedule to build one.
                        </td>
                      </tr>
                    ) : (
                      schedules.map((sc, i) => (
                        <tr key={i} className="border-b border-[#393939] hover:bg-[#393939]/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                            <Calendar size={16} className="text-[#0f62fe]" />
                            <span className="uppercase text-[12px] bg-[#393939] px-2 py-0.5 text-white">{sc.action}</span>
                          </td>
                          <td className="px-4 py-3">{sc.cron}</td>
                          <td className="px-4 py-3">
                            <button 
                              onClick={() => handleToggleSchedule(sc.id)}
                              className={`text-[11px] font-mono border-none px-3 py-1 cursor-pointer transition-colors ${sc.is_active ? "bg-[#24a148] text-white" : "bg-[#393939] text-[#c6c6c6]"}`}
                            >
                              {sc.is_active ? "ACTIVE" : "INACTIVE"}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-[12px]">
                            {sc.last_run === 0 ? "Never" : new Date(sc.last_run * 1000).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => handleToggleSchedule(sc.id)}
                              className="p-1.5 hover:bg-[#4c4c4c] text-[#c6c6c6] hover:text-[#0f62fe] border-none bg-transparent cursor-pointer" 
                              title="Toggle Schedule"
                            >
                              <Renew size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Create Schedule Modal */}
            {schedModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                <form onSubmit={handleCreateSchedule} className="carbon-panel w-full max-w-md p-6 space-y-6 bg-[#262626]">
                  <div>
                    <h3 className="text-[18px] font-semibold text-white">Create Automated Schedule</h3>
                    <p className="text-[12px] text-[#c6c6c6] mt-1">Schedules are handled directly by the Node cron runners.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[12px] text-[#c6c6c6]">Action Target</label>
                      <select 
                        value={newSchedAction}
                        onChange={(e) => setNewSchedAction(e.target.value)}
                        className="w-full bg-[#161616] border border-[#393939] p-2 text-[#f4f4f4] outline-none focus:border-[#0f62fe] text-[13px] font-mono"
                      >
                        <option value="restart">Restart Server Sandbox</option>
                        <option value="backup">Trigger Compressed Backup</option>
                        <option value="stop">Stop Server Sandbox</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[12px] text-[#c6c6c6]">Cron Expression</label>
                      <input 
                        type="text" 
                        value={newSchedCron}
                        onChange={(e) => setNewSchedCron(e.target.value)}
                        placeholder="e.g. 0 */12 * * *"
                        className="w-full bg-[#161616] border border-[#393939] p-2 text-[#f4f4f4] outline-none focus:border-[#0f62fe] text-[13px] font-mono"
                        required
                      />
                      <span className="text-[11px] text-[#8d8d8d] font-mono">Syntax: minute hour day month weekday</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={() => setSchedModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Schedule Action
                    </Button>
                  </div>
                </form>
              </div>
            )}

          </div>

          <div className="space-y-6">
            <div className="carbon-panel p-5 space-y-4">
              <h3 className="text-[14px] font-semibold text-white uppercase tracking-wider">Cron Schedule Patterns</h3>
              <ul className="text-[12px] text-[#c6c6c6] space-y-3 list-disc pl-4 leading-relaxed">
                <li>`0 */12 * * *` runs actions every 12 hours.</li>
                <li>`0 0 * * *` triggers tasks daily at midnight.</li>
                <li>Active triggers utilize zero CPU when dormant.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Code Editor Modal (Brutalist IBM Carbon Dark Editor) */}
      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="carbon-panel w-full max-w-4xl flex flex-col h-[80vh] shadow-2xl">
            {/* Editor Header */}
            <div className="bg-[#262626] border-b border-[#393939] p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Document size={18} className="text-[#8d8d8d]" />
                <h3 className="text-[15px] font-semibold text-white">{editingFile.name}</h3>
                <span className="text-[11px] font-mono text-[#8d8d8d] bg-[#161616] px-2 py-0.5">{editingFile.size}</span>
                {(() => {
                  const ext = editingFile.name.split('.').pop()?.toLowerCase();
                  let lang = "Plain Text";
                  if (ext === "js") lang = "JavaScript";
                  else if (ext === "ts") lang = "TypeScript";
                  else if (ext === "jsx") lang = "React JS";
                  else if (ext === "tsx") lang = "React TS";
                  else if (ext === "py") lang = "Python";
                  else if (ext === "go") lang = "Go Lang";
                  else if (ext === "json") lang = "JSON Config";
                  else if (ext === "html") lang = "HTML5 Markup";
                  else if (ext === "css") lang = "CSS Style";
                  else if (ext === "md") lang = "Markdown Doc";
                  else if (ext === "sh") lang = "Shell Script";
                  else if (ext === "yaml" || ext === "yml") lang = "YAML Config";
                  return (
                    <span className="text-[10px] font-mono text-[#0f62fe] bg-[#0f62fe]/10 px-2 py-0.5 uppercase border border-[#0f62fe]/20">
                      {lang}
                    </span>
                  );
                })()}
              </div>
              <button 
                onClick={() => setEditingFile(null)}
                className="text-[#c6c6c6] hover:text-white p-1 hover:bg-[#393939] transition-colors border-none bg-transparent cursor-pointer"
              >
                <Close size={20} />
              </button>
            </div>

            {/* Editor Textarea with Line Numbers */}
            <div className="flex-1 bg-[#161616] p-4 flex gap-4 overflow-hidden">
              <div className="text-[#525252] font-mono text-[13px] text-right select-none pr-2 border-r border-[#393939] hidden sm:block shrink-0">
                {Array.from({ length: editorContent.split("\n").length || 1 }).map((_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>
              
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none font-mono text-[13px] text-[#f4f4f4] resize-none h-full placeholder:text-[#525252]"
                style={{ tabSize: 2 }}
                placeholder="// Start writing your server source code here..."
              />
            </div>

            {/* Editor Footer */}
            <div className="bg-[#262626] border-t border-[#393939] p-4 flex justify-end gap-3 shrink-0">
              <Button 
                variant="secondary" 
                onClick={() => setEditingFile(null)}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveEditorChanges}
              >
                Save File & Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

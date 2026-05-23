"use client";

import React, { useEffect, useState } from "react";
import { BareMetalServer as ServerIcon, Add, OverflowMenuHorizontal, Chip, DataBase, BlockStorage, Launch, TrashCan } from "@carbon/icons-react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Server {
  id: string;
  name: string;
  status: string;
  node_id: string;
  memory_limit: number;
  cpu_limit: number;
  disk_limit: number;
}

export default function DeploymentsPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const res = await api.get("/servers");
        if (res.data?.data) {
          setServers(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch servers", err);
      } finally {
        setLoading(false);
      }
    };
    fetchServers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deprovision this server instance?")) return;
    try {
      await api.delete(`/servers/${id}`);
      setServers((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert("Failed to deprovision server");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-[#0f62fe] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      
      {/* Carbon Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#393939] pb-4">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-[#f4f4f4] mb-1">Active deployments</h1>
          <p className="text-[14px] text-[#c6c6c6]">System instances provisioned on remote daemon hypervisors.</p>
        </div>

        <Link href="/servers/new">
          <button className="carbon-btn">
            Provision Instance
            <Add size={20} className="ml-4" />
          </button>
        </Link>
      </div>

      {servers.length === 0 ? (
        <div className="carbon-panel p-16 text-center flex flex-col items-center justify-center border-dashed border-[#525252] border-2">
          <div className="mb-4">
            <ServerIcon size={32} className="text-[#8d8d8d]" />
          </div>
          <h3 className="text-[16px] font-semibold text-[#f4f4f4] mb-2">No deployments registered</h3>
          <p className="text-[14px] text-[#c6c6c6] mb-6 max-w-sm">Create and configure your first server node instance now.</p>
          <Link href="/servers/new">
            <button className="carbon-btn">Provision Instance</button>
          </Link>
        </div>
      ) : (
        <div className="carbon-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[12px] font-semibold text-[#c6c6c6] bg-[#262626] border-b border-[#393939] uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Server Identifier</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">vCPU</th>
                  <th className="px-6 py-4 font-medium">Memory</th>
                  <th className="px-6 py-4 font-medium">Storage</th>
                  <th className="px-6 py-4 font-medium">Hypervisor Node</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {servers.map((server) => {
                  const isOnline = server.status === "running";
                  return (
                    <tr key={server.id} className="border-b border-[#393939] hover:bg-[#393939] transition-colors font-sans text-[#c6c6c6]">
                      <td className="px-6 py-4 font-semibold text-[#f4f4f4]">
                        <div className="flex items-center gap-3">
                          <ServerIcon size={16} className="text-[#0f62fe]" />
                          <span>{server.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 ${isOnline ? "bg-[#24a148]" : "bg-[#8d8d8d]"}`}></span>
                          <span className="capitalize text-[13px]">{server.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-[13px]">{server.cpu_limit} Cores</td>
                      <td className="px-6 py-4 font-mono text-[13px]">{(server.memory_limit / 1024).toFixed(1)} GB</td>
                      <td className="px-6 py-4 font-mono text-[13px]">{(server.disk_limit / 1024).toFixed(1)} GB</td>
                      <td className="px-6 py-4 font-mono text-[13px] text-[#8d8d8d]">{server.node_id}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/servers/${server.id}`}>
                            <button className="p-2 hover:bg-[#4c4c4c] text-[#c6c6c6] hover:text-[#0f62fe] transition-colors border-none bg-transparent cursor-pointer" title="Launch Console">
                              <Launch size={16} />
                            </button>
                          </Link>
                          <button 
                            onClick={() => handleDelete(server.id)}
                            className="p-2 hover:bg-[#da1e28]/20 text-[#c6c6c6] hover:text-[#da1e28] transition-colors border-none bg-transparent cursor-pointer" 
                            title="Deprovision"
                          >
                            <TrashCan size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

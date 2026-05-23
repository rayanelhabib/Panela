"use client";

import React, { useEffect, useState } from "react";
import { BareMetalServer as ServerIcon, Add, OverflowMenuVertical, Chip, DataBase, BlockStorage } from "@carbon/icons-react";
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

export default function DashboardPage() {
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

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-[#0f62fe] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      
      {/* Carbon Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#393939] pb-4">
        <div>
          <h1 className="text-[28px] font-normal tracking-tight text-[#f4f4f4] mb-1">Server deployments</h1>
          <p className="text-[14px] text-[#c6c6c6]">Manage and monitor your infrastructure instances.</p>
        </div>

        <Link href="/servers/new">
          <button className="carbon-btn">
            Deploy instance
            <Add size={20} className="ml-4" />
          </button>
        </Link>
      </div>

      {/* Carbon Grid Dashboard */}
      {servers.length === 0 ? (
        <div className="carbon-panel p-16 text-center flex flex-col items-center justify-center border-dashed border-[#525252] border-2">
          <div className="mb-4">
            <ServerIcon size={32} className="text-[#8d8d8d]" />
          </div>
          <h3 className="text-[16px] font-semibold text-[#f4f4f4] mb-2">No active instances</h3>
          <p className="text-[14px] text-[#c6c6c6] mb-6 max-w-sm">Provision a new instance to begin managing your workloads.</p>
          <Link href="/servers/new">
            <button className="carbon-btn-secondary carbon-btn">Provision Instance</button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {servers.map((server) => {
            const isOnline = server.status === "running";
            
            return (
              <Link key={server.id} href={`/servers/${server.id}`} className="block">
                <div className="carbon-panel p-4 h-full flex flex-col carbon-panel-interactive min-h-[200px]">
                  
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#393939] flex items-center justify-center shrink-0">
                        <ServerIcon size={16} className="text-[#f4f4f4]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[14px] text-[#0f62fe] hover:underline truncate max-w-[140px]">{server.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className={`w-2 h-2 ${isOnline ? "bg-[#24a148]" : "bg-[#8d8d8d]"}`} />
                          <span className="text-[12px] text-[#c6c6c6] capitalize">{server.status}</span>
                        </div>
                      </div>
                    </div>
                    <button className="text-[#c6c6c6] hover:text-[#f4f4f4] p-1 bg-transparent border-none cursor-pointer" onClick={(e) => e.preventDefault()}>
                      <OverflowMenuVertical size={16} />
                    </button>
                  </div>

                  {/* Resource Bars (Carbon style: thin, hard lines) */}
                  <div className="mt-auto space-y-3">
                    
                    <div>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-[#c6c6c6] flex items-center gap-1.5"><Chip size={14}/> vCPU</span>
                        <span className="text-[#f4f4f4]">{server.cpu_limit} Core</span>
                      </div>
                      <div className="h-1 w-full bg-[#393939]">
                        <div className="h-full bg-[#0f62fe] w-[25%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-[#c6c6c6] flex items-center gap-1.5"><DataBase size={14}/> Memory</span>
                        <span className="text-[#f4f4f4]">{(server.memory_limit / 1024).toFixed(1)} GB</span>
                      </div>
                      <div className="h-1 w-full bg-[#393939]">
                        <div className="h-full bg-[#0f62fe] w-[45%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-[#c6c6c6] flex items-center gap-1.5"><BlockStorage size={14}/> Storage</span>
                        <span className="text-[#f4f4f4]">{(server.disk_limit / 1024).toFixed(1)} GB</span>
                      </div>
                      <div className="h-1 w-full bg-[#393939]">
                        <div className="h-full bg-[#0f62fe] w-[15%]" />
                      </div>
                    </div>

                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

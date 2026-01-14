"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { VaultRail } from "@/components/vault-rail";
import { ReadingView } from "@/components/reading-view";
import { RightRail } from "@/components/right-rail";
import type { RailMode } from "@/components/right-rail";
import { CommandPalette } from "@/components/command-palette";
import { LeftDrawer, RightDrawer, Fab } from "@/components/mobile-drawers";
import { useMobile } from "@/hooks/useMobile";
import { getFile, getGraphStats } from "@/api/client";

export default function Home() {
  const mobile = useMobile();
  const [searchOpen, setSearchOpen] = useState(false);
  const [rightMode, setRightMode] = useState<RailMode>("outline");
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const activeFileName = "Select a file";
  const activeFolderName = "";
  const [leftDrawer, setLeftDrawer] = useState(false);
  const [rightDrawer, setRightDrawer] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["graphStats"],
    queryFn: getGraphStats,
    staleTime: 60_000,
  });

  const { data: fileContent } = useQuery({
    queryKey: ["file", activeFileId],
    queryFn: () => getFile(activeFileId!),
    enabled: !!activeFileId,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleSelectFile = useCallback((id: string) => {
    setActiveFileId(id);
  }, []);

  const handleChatToggle = useCallback(() => {
    if (mobile) {
      setRightDrawer(true);
      setRightMode("chat");
    } else {
      setRightMode((prev) => (prev === "chat" ? "outline" : "chat"));
    }
  }, [mobile]);

  const handleAskVault = useCallback(() => {
    setRightMode("chat");
    if (mobile) setRightDrawer(true);
  }, [mobile]);

  return (
    <>
      <Header
        onSearchOpen={() => setSearchOpen(true)}
        onChatToggle={handleChatToggle}
        chatOpen={rightMode === "chat"}
        onMenu={() => setLeftDrawer(true)}
        mobile={mobile}
        noteCount={stats?.nodeCount ?? 0}
      />

      <div className="nv-shell">
        {!mobile && (
          <VaultRail activeId={activeFileId} onSelectFile={handleSelectFile} />
        )}

        <ReadingView
          fileId={activeFileId}
          fileName={activeFileName}
          folderName={activeFolderName}
        />

        {!mobile && (
          <RightRail
            mode={rightMode}
            onModeChange={setRightMode}
            fileId={activeFileId}
            fileContent={fileContent}
          />
        )}
      </div>

      {mobile && <Fab onClick={() => setRightDrawer(true)} />}

      <LeftDrawer
        open={mobile && leftDrawer}
        onClose={() => setLeftDrawer(false)}
        activeId={activeFileId}
        onSelectFile={handleSelectFile}
      />

      <RightDrawer
        open={mobile && rightDrawer}
        onClose={() => setRightDrawer(false)}
        mode={rightMode}
        onModeChange={setRightMode}
        fileId={activeFileId}
        fileContent={fileContent}
      />

      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectFile={handleSelectFile}
        onAskVault={handleAskVault}
      />
    </>
  );
}

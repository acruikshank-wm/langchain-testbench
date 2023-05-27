import React, { createContext, useState, useCallback, useMemo } from "react";
import { ChainSpec } from "../model/specs";
import { insertChainSpec as insertGeneratedChainSpec, updateChainSpec } from "../model/spec_control";
import { deepEquals } from "../util/sets";
import { findByChainId } from "../model/spec_control";

export type ChainRetriever = () => ChainSpec | null;
export type UpdateSpecFunc = (spec: ChainSpec) => void;

export interface ChainSpecContextType {
  chainSpec: ChainSpec | null;
  setChainSpec: (spec: ChainSpec) => void,
  chainName: string;
  setChainName: (name: string) => void,
  revision: string | null;
  setRevision: (revision: string) => void,
  insertChainSpec: (type: string, chainId: number, index: number) => void,
  updateChainSpec: UpdateSpecFunc,
  latestChainSpec: ChainRetriever,
  findByChainId: (chainId: number) => ChainSpec | undefined,
  readyToInteract: boolean,
  isInteracting: boolean,
  setIsInteracting: (isInteracting: boolean) => void,
}

const ChainSpecContext = createContext<ChainSpecContextType>({
  chainSpec: null,
  setChainSpec: (_: ChainSpec) => {},
  chainName: "",
  setChainName: (_: string) => {},
  revision: null,
  setRevision: (_: string) => {},
  insertChainSpec: (_: string, _chainId: number, _index: number) => {},
  updateChainSpec: (_: ChainSpec) => {},
  latestChainSpec: () => null,
  findByChainId: (_: number) => undefined,
  readyToInteract: false,
  isInteracting: false,
  setIsInteracting: (_: boolean) => undefined,
});

interface ChainSpecProviderProps {
  children: React.ReactNode;
}

export const ChainSpecProvider: React.FC<ChainSpecProviderProps> = ({ children }) => {
  const [chainSpec, setChainSpec] = useState<ChainSpec | null>(null);
  const [chainName, setChainName] = useState<string>("");
  const [dirtyChainSpec, setDirtyChainSpec] = useState<ChainSpec | null>(null);
  const [nextChainId, setNextChainId] = useState<number>(0);
  const [revision, setRevision] = useState<string|null>(null);
  const [isInteracting, setIsInteracting] = useState<boolean>(false);

  const insertChainSpec = useCallback((type: string, chainId: number, index: number): void => {
    const newSpec = insertGeneratedChainSpec(dirtyChainSpec, nextChainId, type, chainId, index);
    setChains(newSpec);
    setNextChainId(nextChainId + 1);
  }, [dirtyChainSpec, nextChainId]);

  const latestChainSpec = useCallback((): ChainSpec | null => {
    return dirtyChainSpec;
  }, [dirtyChainSpec])

  const setChains = (spec: ChainSpec): void => {
    setChainSpec(spec);
    setDirtyChainSpec(spec);
  }

  const findChainInCurrentSpec = useCallback((chainId: number): ChainSpec | undefined => {
    if (!dirtyChainSpec) {
      return undefined;
    }
    return findByChainId(chainId, dirtyChainSpec);
  }, [chainSpec]);

  const updateDirtyChainSpec = useCallback((spec: ChainSpec): void => {
    const result = updateChainSpec(dirtyChainSpec, spec);
    if (!result.found) {
      throw new Error(`Could not find chain spec with id ${spec.chain_id} to update`);
    }
    setDirtyChainSpec(result.chainSpec);
  }, [dirtyChainSpec]);

  const readyToInteract = useMemo(() => {
    return !!chainSpec && deepEquals(chainSpec, dirtyChainSpec);
  }, [chainSpec, dirtyChainSpec]);

  return (
    <ChainSpecContext.Provider value={{ 
      chainSpec,
      setChainSpec: setChains,
      chainName,
      setChainName,
      revision,
      setRevision,
      insertChainSpec,
      updateChainSpec: updateDirtyChainSpec,
      latestChainSpec,
      findByChainId: findChainInCurrentSpec,
      readyToInteract,
      isInteracting,
      setIsInteracting,
    }}>
      {children}
    </ChainSpecContext.Provider>
  );
};

export default ChainSpecContext;
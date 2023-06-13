import { useCallback, useContext, useState, useEffect, useMemo } from "react";
import { LLMSpec, SequentialSpec, CaseSpec, ReformatSpec, APISpec, ChainSpec } from '../model/specs';
import QuickMenu from "./QuickMenu";
import ChainSpecContext, { UpdateSpecFunc } from "../contexts/ChainSpecContext";
import HighlightedTextarea from "./HighlightedTextarea";
import FormatReducer from "../util/FormatReducer";
import "./style/Designer.css"
import { LLMContext } from "../contexts/LLMContext";

type InsertChainFunc = (type: string, chainId: number, index: number) => void;

interface LLMSpecDesignerProps { spec: LLMSpec, updateChainSpec: UpdateSpecFunc };

const specTypeOptions = {
  llm_spec: 'LLM',
  sequential_spec: 'Sequential',
  case_spec: 'Case',
  reformat_spec: 'Reformat',
  api_spec: 'API',
};

const LLMSpecDesigner = ({ spec, updateChainSpec }: LLMSpecDesignerProps) => {
  const { llms } = useContext(LLMContext);

  const [prompt, setPrompt] = useState<string>(spec.prompt);
  const [outputKey, setOutputKey] = useState<string>(spec.output_key);
  const [variables, setVariables] = useState<string[]>([]);
  const [llm, setLLM] = useState<string>(spec.llm_key);

  const formatReducer = useMemo(() => new FormatReducer(
    /{(.*?)}/g,
    () => new Set<string>(),
    (variables: Set<string>, _, variable) => [
      variables.add(variable),
      `<span class="expr">{<span class="var-name">${variable}</span>}</span>`
    ],
    (variables: Set<string>) => setTimeout(() => setVariables(Array.from(variables)), 0)
  ), []);

  useEffect(() => {
    updateChainSpec({
      ...spec,
      llm_key: llm,
      prompt,
      output_key: outputKey,
      input_keys: variables,
    });
  }, [llm, prompt, outputKey, variables]);

  useEffect(() => {
    setPrompt(spec.prompt);
    setOutputKey(spec.output_key);
    setLLM(spec.llm_key);
    setVariables(spec.input_keys);
  }, [spec]);

  return (
    <div className="llm-spec spec-designer">
      <h3 className="chain-id">LLM {spec.chain_id}</h3>
      <HighlightedTextarea
        value={prompt}
        onChange={setPrompt}
        formatReducer={formatReducer}
        placeholder="Enter prompt here."
      />
      <div className="form-element">
        <label>LLM</label>
        <select value={llm} onChange={e => setLLM(e.target.value)}>
          {Object.keys(llms).map(llm => <option key={llm} value={llm}>{llm}</option>)}
        </select>
      </div>
      <div className="form-element">
        <label>Output Key</label>
        <input className="var-name-input" value={outputKey} onChange={e => setOutputKey(e.target.value)} />
      </div>
    </div>
  );
};

interface SequentialSpecDesignerProps { spec: SequentialSpec, insertChain: InsertChainFunc, updateChainSpec: UpdateSpecFunc };

const SequentialSpecDesigner = ({ spec, insertChain, updateChainSpec }: SequentialSpecDesignerProps) => {
  return (
    <div className="sequential-spec spec-designer">
      <h3 className="chain-id">Sequential {spec.chain_id}</h3>
      <QuickMenu selectValue={(option) => insertChain(option, spec.chain_id, 0)} options={specTypeOptions} />
      {spec.chains.flatMap((chain: ChainSpec, idx: number) => [
        renderChainSpec(chain, insertChain, updateChainSpec),
        <QuickMenu selectValue={(option) => insertChain(option, spec.chain_id, idx+1)} options={specTypeOptions} key={`button-${idx+1}`}/>
      ])}
    </div>
  );
};

interface CaseSpecDesignerProps { spec: CaseSpec, insertChain: InsertChainFunc, updateChainSpec: UpdateSpecFunc };

const CaseSpecDesigner = ({ spec, insertChain, updateChainSpec }: CaseSpecDesignerProps) => {
  const { findByChainId } = useContext(ChainSpecContext);
  const [categorizationKey, setCategorizationKey] = useState<string>(spec.categorization_key);
  const [cases, setCases] = useState<[string, ChainSpec][]>([]);

  useEffect(() => {
    setCategorizationKey(spec.categorization_key);
    const newCases = {...spec.cases};
    if (spec.default_case) newCases._default = spec.default_case;
    setCases(Object.entries(newCases));
  }, [spec]);

  const updateCaseKey = useCallback((index: number, key: string) => {
    const newCases: [string, ChainSpec][] = [
      ...cases.slice(0, index),
      [key, cases[index][1]],
      ...cases.slice(index+1)];
    setCases(newCases);
  }, [cases]);

  const mustFind = (chainId: number): ChainSpec => {
    const chain = findByChainId(chainId);
    if (!chain) throw new Error(`Chain ${chainId} not found.`);
    return chain;
  };

  const computeCases = useCallback((): [ChainSpec, Record<string, ChainSpec>] => {
    const newCases = Object.fromEntries(cases.map(([key, chain]) => [key, mustFind(chain.chain_id)]));
    const defaultCase = newCases._default;
    delete newCases._default;
    return [defaultCase, newCases];
  }, [cases]);

  useEffect(() => {
    if (!cases.length) return;
    const [defaultCase, updatedCases] = computeCases();
    updateChainSpec({
      ...spec,
      cases: updatedCases,
      categorization_key: categorizationKey,
      default_case: defaultCase,
    });
  }, [categorizationKey, cases]);

  return (
    <div className="case-spec spec-designer">
      <h3 className="chain-id">Case {spec.chain_id}</h3>
      <div className="form-element">
        <label>Category Key</label>
        <input className="var-name-input" value={categorizationKey} onChange={e => setCategorizationKey(e.target.value)} />
      </div>
      <QuickMenu selectValue={(option) => insertChain(option, spec.chain_id, 0)} options={specTypeOptions} />
      {cases.flatMap((item: [string, ChainSpec], idx: number) => [
        <div className="case-spec-case" key={`spec-case-${item[1].chain_id}`}>
          <input className="case-spec-case__key" defaultValue={item[0]} onChange={(e) => updateCaseKey(idx, e.target.value)} />
          {renderChainSpec(item[1] as ChainSpec, insertChain, updateChainSpec)}
        </div>,
        <QuickMenu selectValue={(option) => insertChain(option, spec.chain_id, idx+1)} options={specTypeOptions} key={`button-${idx+1}`}/>,
      ])}
    </div>
  );
};


type ExtendedFormatterState = [inputs: Set<string>, internal: Set<string>];

const extendedFormatterRegex = /\{(join|parse_json|let|expr|int|float):([^:\{\}]+)(:([^:\{\}]+))?\}|(\{([^\{\}]*)\})/g;
const parseFormatExpression = (expr: string): [string, string] => {
  const variable = expr.match(/^[_A-Za-z0-9]+/)?.[0] || '';
  return [variable, expr.slice(variable.length)];
};
const condAdd = (set1: Set<string>, set2: Set<string>, item: string): Set<string> => (
  set2.has(item) ? set1 : set1.add(item)
);

const extendedFormatterReduceFunc = (
  [inputs, internal]: ExtendedFormatterState,
  _: string,
  exprType: string | undefined,
  exprParam1: string | undefined,
  _ep2Group: string | undefined,
  exprParam2: string | undefined,
  stdExpr: string | undefined,
  stdExprVar: string | undefined,
): [ExtendedFormatterState, string] => {
  const [newInputs, newInternal] = [new Set(inputs), new Set(internal)];
  if (exprType === 'parse_json' || exprType === 'let' || exprType === 'int' || exprType === 'float') {
    const [variable, expr] = parseFormatExpression(exprParam1 || '');
    return [
      [condAdd(newInputs, newInternal, variable), newInternal.add(exprParam2 || 'data')], 
      `<span class="expr">\{${exprType}:<span class="var-name">${variable}</span>${expr}:${exprParam2}\}</span>`
    ];
  } else if (exprType === 'join') {
    const [variable, expr] = parseFormatExpression(exprParam1 || '');
    return [
      [condAdd(newInputs, newInternal, variable), newInternal.add('item').add('index')],
      `<span class="expr">\{${exprType}:<span class="var-name">${variable}</span>${expr}:${exprParam2}\}</span>`
    ];
  } else if (exprType === 'expr') {
    const formatted = exprParam1?.replace(/[_A-Za-z][_A-Za-z0-9]*/g, (variable) => { 
      condAdd(newInputs, newInternal, variable); 
      return `<span class="var-name">${variable}</span>`;
    });
    return [
      [newInputs, newInternal.add(exprParam2 || 'data')],
      `<span class="expr">\{${exprType}:${formatted}:${exprParam2}\}</span>`
    ]
  } else if (stdExpr) {
    const [variable, expr] = parseFormatExpression(stdExprVar || '');
    return [
      [condAdd(newInputs, newInternal, variable), newInternal],
      `<span class="expr">\{<span class="var-name">${variable}</span>${expr}\}</span>`
    ]
  }
  return [[newInputs, newInternal], '<span class="error">ERROR</span>'];
}

interface ReformatSpecDesignerProps { spec: ReformatSpec, updateChainSpec: UpdateSpecFunc  };

const ReformatSpecDesigner = ({ spec, updateChainSpec }: ReformatSpecDesignerProps) => {
  const [formatters, setFormatters] = useState<[string, string][]>([]);
  const [variables, setVariables] = useState<string[]>([]);

  useEffect(() => {
    setFormatters(Object.entries({...spec.formatters}));
  }, [spec]);

  const updateFormatter = useCallback((index: number, key: string, value: string) => {
    setFormatters([
      ...formatters.slice(0, index), [key, value], ...formatters.slice(index+1)
    ]);
  }, [formatters]);

  const formatReducer = useMemo(() => new FormatReducer<ExtendedFormatterState>(
    extendedFormatterRegex,
    () => [new Set<string>(), new Set<string>()],
    extendedFormatterReduceFunc,
    ([inputs, _]: ExtendedFormatterState) => setVariables(Array.from(inputs))
  ), []);

  const addFormatter = useCallback(() => {
    setFormatters([...formatters, [`output_key_${formatters.length}`, '']]);
  }, [formatters]);

  useEffect(() => {
    updateChainSpec({
      ...spec,
      input_keys: variables,
      formatters: Object.fromEntries(formatters),
    });
  }, [formatters, variables]);

  return (
    <div className="reformat-spec spec-designer">
      <h3 className="chain-id">Reformat {spec.chain_id}</h3>
      <div className="formatters">
        { formatters.map(([key, value], idx) => (
          <div className="formatter form-element" key={`reformat-${idx}`}>
            <input className="formatter__key var-name-input"
              defaultValue={key}
              onChange={(e) => updateFormatter(idx, e.target.value, value)}
              placeholder="Output Key"
            />

            <HighlightedTextarea
              value={value}
              onChange={(newValue) => updateFormatter(idx, key, newValue)}
              formatReducer={formatReducer}
              placeholder="Enter format command."
            />
          </div>
        ))}
      </div>
      <button className="add-formatter" onClick={addFormatter}>+ formatter</button>
    </div>
  );
};

interface APISpecDesignerProps { spec: APISpec, updateChainSpec: UpdateSpecFunc };

const APISpecDesigner = ({ spec, updateChainSpec }: APISpecDesignerProps) => {
  const [url, setUrl] = useState<string>(spec.url);
  const [method, setMethod] = useState<string>(spec.method);
  const [headers, setHeaders] = useState<string>(JSON.stringify(spec.headers, null, 2));
  const [headersError, setHeadersError] = useState<boolean>(false);
  const [body, setBody] = useState<string | null>(spec.body);
  const [outputKey, setOutputKey] = useState<string>(spec.output_key);

  useEffect(() => {
    setUrl(spec.url);
    setMethod(spec.method);
    setHeaders(JSON.stringify(spec.headers, null, 2));
    setBody(spec.body);
  }, [spec]);

  const tryParseHeaders = useCallback((str: string) => {
    try {
      setHeadersError(false);
      return JSON.parse(str);
    } catch (e) {
      setHeadersError(true);
    }
    return spec.headers;
  }, [spec.headers]);

  useEffect(() => {
    const vars = new Set<string>();
    const regex = /\{([a-zA-Z0-9_]+)\}/g;
    const add = (_: string, ...matches: any[]): string => { vars.add(matches[0]); return ""; };
    url.replace(regex, add);
    method.replace(regex, add);
    headers.replace(regex, add);
    if (body) body.replace(regex, add);

    updateChainSpec({
      ...spec,
      url,
      method,
      input_keys: Array.from(vars),
      headers: tryParseHeaders(headers),
      body,
      output_key: outputKey,
    });
  }, [url, method, headers, body, outputKey]);

  return (
    <div className="api-spec spec-designer">
      <h3 className="chain-id">API {spec.chain_id}</h3>
      <div className="form-element">
        <label>URL</label>
        <input className="text-input" value={url} onChange={e => setUrl(e.target.value)} placeholder="URL" />
      </div>
      <div className="form-element">
        <label>Method</label>
        <input className="text-input" value={method} onChange={e => setMethod(e.target.value)} placeholder="GET | POST" />
      </div>
      <div className={`form-element text ${headersError ? "error" : ""}`}>
        <label>Headers</label>
        <textarea
          defaultValue={headers}
          onChange={e => setHeaders(e.target.value)}
          placeholder="{'header1': 'value'}"/>
      </div>
      <div className="form-element text">
        <label>Body</label>
        <textarea
          defaultValue={body || ""}
          onChange={e => setBody(e.target.value)}
          placeholder="Optional body content"/>
      </div>
      <div className="form-element">
        <label>Output Key</label>
        <input className="var-name-input" value={outputKey} onChange={e => setOutputKey(e.target.value)} />
      </div>
    </div>
  );
};

const renderChainSpec = (spec: ChainSpec, insertChain: InsertChainFunc, updateSpec: UpdateSpecFunc) => {
  switch (spec.chain_type) {
    case "llm_spec":
      return <LLMSpecDesigner spec={spec} updateChainSpec={updateSpec} key={`llm-spec-${spec.chain_id}`} />;
    case "sequential_spec":
      return <SequentialSpecDesigner spec={spec} updateChainSpec={updateSpec} insertChain={insertChain} key={`sequential-spec-${spec.chain_id}`} />;
    case "case_spec":
      return <CaseSpecDesigner spec={spec} updateChainSpec={updateSpec} insertChain={insertChain} key={`case-spec-${spec.chain_id}`} />;
    case "reformat_spec":
      return <ReformatSpecDesigner spec={spec} updateChainSpec={updateSpec} key={`reformat-spec-${spec.chain_id}`}/>;
    case "api_spec":
      return <APISpecDesigner spec={spec} updateChainSpec={updateSpec} key={`api-spec-${spec.chain_id}`}/>;
  }
};

const Designer = () => {
  const { chainSpec: spec, insertChainSpec, updateChainSpec, isInteracting } = useContext(ChainSpecContext);

  return (
    <div className={`designer ${isInteracting ? 'interacting' : ''}`}>
      { spec 
        ? renderChainSpec(spec, insertChainSpec, updateChainSpec)
        : <QuickMenu selectValue={(option) => insertChainSpec(option, 0, 0)} options={specTypeOptions}/> 
      }
    </div>
  );
};

export default Designer;

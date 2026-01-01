
import React, { useState, useEffect, useRef, useCallback, useContext, createContext } from 'react';
import Cell from './Cell';
import { 
    ActionType, 
    CellContentType, 
    CellDataType, 
    Sheet, 
    Workbook, 
    SpreadsheetCell, 
    CellCoordinates, 
    CellRange, 
    CellStyle 
} from '../types';
import { askGemini } from '../services/geminiService';

const DEFAULT_COLS = 26;
const DEFAULT_ROWS = 100;

interface SpreadsheetState {
    workbook: Workbook;
    selectedCells: CellRange | null;
    activeCell: CellCoordinates | null;
    clipboard: any | null;
    formulaBarValue: string;
    isEditing: boolean;
    undoStack: any[][];
    redoStack: any[][];
    dialogOpen: { type: string; props: any } | null;
    sidebarOpen: boolean;
    sidebarContent: string | null;
    activeRibbonTab: string;
    notifications: any[];
    zoomLevel: number;
    findReplace?: any;
    statusMessage?: any;
    currentUserId: string;
    currentUserName: string;
}

const getCellId = (coords: CellCoordinates) => `${String.fromCharCode(65 + coords.col)}${coords.row + 1}`;
const getCoordsFromCellId = (cellId: string): CellCoordinates => {
    const colMatch = cellId.match(/[A-Z]+/);
    const rowMatch = cellId.match(/\d+/);
    if (!colMatch || !rowMatch) return { row: 0, col: 0 };
    const col = colMatch[0].split('').reduce((sum, char) => sum * 26 + (char.charCodeAt(0) - 64), 0) - 1;
    const row = parseInt(rowMatch[0], 10) - 1;
    return { row, col };
};

const spreadsheetReducer = (state: SpreadsheetState, action: any): SpreadsheetState => {
    const currentSheet = state.workbook.sheets.find(s => s.id === state.workbook.activeSheetId);
    
    switch (action.type) {
        case ActionType.SET_WORKBOOK:
            return { ...state, workbook: action.payload };
        case ActionType.UPDATE_CELL: {
            const { sheetId, coords, data, userId, userName } = action.payload;
            const sheet = state.workbook.sheets.find(s => s.id === sheetId);
            if (!sheet) return state;
            const cellId = getCellId(coords);
            const oldCell = sheet.data[cellId];
            const newCell = { ...oldCell, ...data, id: cellId };
            const newSheetData = { ...sheet.data, [cellId]: newCell };
            const updatedSheet = { ...sheet, data: newSheetData };
            const updatedSheets = state.workbook.sheets.map(s => s.id === sheetId ? updatedSheet : s);
            return {
                ...state,
                workbook: { ...state.workbook, sheets: updatedSheets },
                undoStack: [...state.undoStack, [{ type: 'cell_edit', sheetId, details: { cellId, oldValue: oldCell?.value, newValue: newCell.value } }]],
            };
        }
        case ActionType.SET_ACTIVE_CELL:
            return { ...state, activeCell: action.payload };
        case ActionType.SET_SELECTED_CELLS:
            return { ...state, selectedCells: action.payload };
        case ActionType.SET_FORMULA_BAR_VALUE:
            return { ...state, formulaBarValue: action.payload };
        case ActionType.SET_EDITING_MODE:
            return { ...state, isEditing: action.payload };
        case ActionType.SET_ACTIVE_SHEET:
            return { ...state, workbook: { ...state.workbook, activeSheetId: action.payload }, selectedCells: null, activeCell: null };
        case ActionType.TOGGLE_SIDEBAR:
            return { ...state, sidebarOpen: !state.sidebarOpen, sidebarContent: action.payload || state.sidebarContent };
        case ActionType.SET_SIDEBAR_CONTENT:
            return { ...state, sidebarContent: action.payload, sidebarOpen: !!action.payload };
        case ActionType.SET_ACTIVE_RIBBON_TAB:
            return { ...state, activeRibbonTab: action.payload };
        case ActionType.ADD_NOTIFICATION:
            return { ...state, notifications: [...state.notifications, action.payload] };
        case ActionType.REMOVE_NOTIFICATION:
            return { ...state, notifications: state.notifications.filter((n: any) => n.id !== action.payload) };
        case ActionType.SET_ZOOM_LEVEL:
            return { ...state, zoomLevel: action.payload };
        case ActionType.OPEN_DIALOG:
            return { ...state, dialogOpen: action.payload };
        case ActionType.CLOSE_DIALOG:
            return { ...state, dialogOpen: null };
        case ActionType.TOGGLE_GRIDLINES: {
            const { sheetId, visibility } = action.payload;
            const updatedSheets = state.workbook.sheets.map(s => s.id === sheetId ? { ...s, gridlineVisibility: visibility } : s);
            return { ...state, workbook: { ...state.workbook, sheets: updatedSheets } };
        }
        case ActionType.APPLY_CELL_STYLE: {
            const { sheetId, range, style } = action.payload;
            const sheet = state.workbook.sheets.find(s => s.id === sheetId);
            if (!sheet) return state;
            const updatedData = { ...sheet.data };
            for (let r = range.start.row; r <= range.end.row; r++) {
                for (let c = range.start.col; c <= range.end.col; c++) {
                    const id = getCellId({ row: r, col: c });
                    updatedData[id] = { ...updatedData[id], style: { ...updatedData[id]?.style, ...style } };
                }
            }
            const updatedSheets = state.workbook.sheets.map(s => s.id === sheetId ? { ...sheet, data: updatedData } : s);
            return { ...state, workbook: { ...state.workbook, sheets: updatedSheets } };
        }
        default:
            return state;
    }
};

const SpreadsheetContext = createContext<any>(undefined);

const SpreadsheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const initialWorkbook: Workbook = {
        id: 'workbook-1',
        name: 'Enterprise Ledger v1.0',
        sheets: [
            {
                id: 'sheet-1',
                name: 'Financials',
                data: {
                    'A1': { id: 'A1', value: 'Quarterly Report', type: CellContentType.VALUE, dataType: CellDataType.TEXT, style: { fontWeight: 'bold', fontSize: 16 } },
                    'A2': { id: 'A2', value: 'Sales', type: CellContentType.VALUE, dataType: CellDataType.TEXT },
                    'B2': { id: 'B2', value: 12500, type: CellContentType.VALUE, dataType: CellDataType.NUMBER },
                    'A3': { id: 'A3', value: 'Expenses', type: CellContentType.VALUE, dataType: CellDataType.TEXT },
                    'B3': { id: 'B3', value: 4800, type: CellContentType.VALUE, dataType: CellDataType.NUMBER },
                    'A4': { id: 'A4', value: 'Profit', type: CellContentType.VALUE, dataType: CellDataType.TEXT, style: { fontWeight: 'bold' } },
                    'B4': { id: 'B4', value: 7700, type: CellContentType.VALUE, dataType: CellDataType.NUMBER, formula: '=B2-B3', style: { fontWeight: 'bold' } },
                },
                dimensions: { rows: 50, cols: 20 },
                mergedCells: [],
                rowMetadata: {},
                colMetadata: {},
                gridlineVisibility: true,
            }
        ],
        activeSheetId: 'sheet-1',
        collaborators: [],
        workbookSettings: {},
        namedRanges: []
    };

    const [state, dispatch] = React.useReducer(spreadsheetReducer, {
        workbook: initialWorkbook,
        selectedCells: null,
        activeCell: null,
        clipboard: null,
        formulaBarValue: '',
        isEditing: false,
        undoStack: [],
        redoStack: [],
        dialogOpen: null,
        sidebarOpen: false,
        sidebarContent: null,
        activeRibbonTab: 'home',
        notifications: [],
        zoomLevel: 1.0,
        currentUserId: 'user-1',
        currentUserName: 'Master Admin'
    });

    return (
        <SpreadsheetContext.Provider value={{ state, dispatch }}>
            {children}
        </SpreadsheetContext.Provider>
    );
};

const useSpreadsheet = () => useContext(SpreadsheetContext);

const Ribbon: React.FC = () => {
    const { state, dispatch } = useSpreadsheet();
    const tabs = ['home', 'insert', 'data', 'formulas', 'view', 'ai'];

    return (
        <div className="bg-gray-800 border-b border-gray-700 select-none">
            <div className="flex border-b border-gray-700 bg-gray-900">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        className={`px-6 py-2 text-xs font-bold uppercase tracking-wider ${state.activeRibbonTab === tab ? 'bg-gray-800 border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                        onClick={() => dispatch({ type: ActionType.SET_ACTIVE_RIBBON_TAB, payload: tab })}
                    >
                        {tab}
                    </button>
                ))}
            </div>
            <div className="p-2 flex items-center space-x-4 overflow-x-auto">
                {state.activeRibbonTab === 'home' && (
                    <>
                        <RibbonGroup label="Font">
                           <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm font-bold" onClick={() => state.selectedCells && dispatch({ type: ActionType.APPLY_CELL_STYLE, payload: { sheetId: state.workbook.activeSheetId, range: state.selectedCells, style: { fontWeight: 'bold' } } })}>B</button>
                           <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm italic" onClick={() => state.selectedCells && dispatch({ type: ActionType.APPLY_CELL_STYLE, payload: { sheetId: state.workbook.activeSheetId, range: state.selectedCells, style: { fontStyle: 'italic' } } })}>I</button>
                        </RibbonGroup>
                        <RibbonGroup label="Styles">
                            <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white" onClick={() => dispatch({ type: ActionType.OPEN_DIALOG, payload: { type: 'conditionalFormatting', props: {} } })}>Conditional Formatting</button>
                        </RibbonGroup>
                    </>
                )}
                {state.activeRibbonTab === 'ai' && (
                    <div className="flex space-x-2">
                        <button className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-xs font-bold flex items-center" onClick={() => dispatch({ type: ActionType.SET_SIDEBAR_CONTENT, payload: 'ai_assistant' })}>
                            <span className="mr-2">✨</span> AI Assistant
                        </button>
                        <button className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-bold" onClick={() => dispatch({ type: ActionType.OPEN_DIALOG, payload: { type: 'aiSettings', props: {} } })}>Settings</button>
                    </div>
                )}
                {state.activeRibbonTab === 'view' && (
                    <RibbonGroup label="Show/Hide">
                        <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs" onClick={() => dispatch({ type: ActionType.TOGGLE_GRIDLINES, payload: { sheetId: state.workbook.activeSheetId, visibility: !state.workbook.sheets.find(s => s.id === state.workbook.activeSheetId)?.gridlineVisibility } })}>Toggle Gridlines</button>
                    </RibbonGroup>
                )}
            </div>
        </div>
    );
};

const RibbonGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex flex-col items-center border-r border-gray-700 pr-4">
        <div className="flex space-x-1">{children}</div>
        <span className="text-[10px] text-gray-500 mt-1 uppercase font-bold">{label}</span>
    </div>
);

const FormulaBar: React.FC = () => {
    const { state, dispatch } = useSpreadsheet();
    const inputRef = useRef<HTMLInputElement>(null);

    const activeCellId = state.activeCell ? getCellId(state.activeCell) : '';

    useEffect(() => {
        if (state.activeCell) {
            const sheet = state.workbook.sheets.find(s => s.id === state.workbook.activeSheetId);
            const cell = sheet?.data[activeCellId];
            dispatch({ type: ActionType.SET_FORMULA_BAR_VALUE, payload: cell?.formula || cell?.rawInput || cell?.value?.toString() || '' });
        }
    }, [state.activeCell, state.workbook.activeSheetId]);

    const handleSumbit = (e: React.FormEvent) => {
        e.preventDefault();
        if (state.activeCell) {
            const val = state.formulaBarValue;
            let type = CellContentType.VALUE;
            let calculatedVal: any = val;
            if (val.startsWith('=')) {
                type = CellContentType.FORMULA;
                // Simple eval for demo - in production use a real parser
                try {
                  calculatedVal = val.substring(1); // placeholder
                } catch(e) {
                  calculatedVal = "#ERROR!";
                }
            } else if (!isNaN(Number(val))) {
                calculatedVal = Number(val);
            }
            dispatch({ 
                type: ActionType.UPDATE_CELL, 
                payload: { 
                    sheetId: state.workbook.activeSheetId, 
                    coords: state.activeCell, 
                    data: { value: calculatedVal, rawInput: val, type } 
                } 
            });
            dispatch({ type: ActionType.SET_EDITING_MODE, payload: false });
        }
    };

    return (
        <div className="bg-gray-800 border-b border-gray-700 p-1 flex items-center space-x-2 shadow-inner">
            <div className="w-16 text-center font-mono text-xs text-blue-400 font-bold border-r border-gray-700">{activeCellId}</div>
            <div className="text-gray-500 font-bold italic text-sm">fx</div>
            <form onSubmit={handleSumbit} className="flex-grow">
                <input 
                    ref={inputRef}
                    className="w-full bg-transparent border-none focus:ring-0 text-sm text-gray-100 placeholder-gray-600"
                    placeholder="Enter formula or value..."
                    value={state.formulaBarValue}
                    onChange={(e) => dispatch({ type: ActionType.SET_FORMULA_BAR_VALUE, payload: e.target.value })}
                />
            </form>
        </div>
    );
};

const SpreadsheetGrid: React.FC = () => {
    const { state, dispatch } = useSpreadsheet();
    const sheet = state.workbook.sheets.find(s => s.id === state.workbook.activeSheetId);
    if (!sheet) return null;

    const rows = Array.from({ length: sheet.dimensions.rows });
    const cols = Array.from({ length: sheet.dimensions.cols });

    return (
        <div className="flex-grow overflow-auto relative bg-gray-900 custom-scrollbar">
            <table className={`table-fixed border-collapse min-w-full ${sheet.gridlineVisibility ? '' : 'hide-gridlines'}`}>
                <thead>
                    <tr>
                        <th className="sticky top-0 left-0 z-50 bg-gray-800 border border-gray-700 w-10 h-8"></th>
                        {cols.map((_, i) => (
                            <th key={i} className="sticky top-0 z-40 bg-gray-800 border border-gray-700 text-[10px] text-gray-400 font-normal w-24">
                                {String.fromCharCode(65 + i)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((_, r) => (
                        <tr key={r}>
                            <td className="sticky left-0 z-30 bg-gray-800 border border-gray-700 text-[10px] text-gray-400 text-center h-6">
                                {r + 1}
                            </td>
                            {cols.map((_, c) => {
                                const id = getCellId({ row: r, col: c });
                                const cellData = sheet.data[id];
                                const isActive = state.activeCell?.row === r && state.activeCell?.col === c;
                                const isSelected = state.selectedCells && 
                                    r >= state.selectedCells.start.row && r <= state.selectedCells.end.row &&
                                    c >= state.selectedCells.start.col && c <= state.selectedCells.end.col;

                                return (
                                    <td 
                                        key={c}
                                        className={`border border-gray-800 relative cursor-cell p-0 h-6 min-w-[6rem] ${isSelected ? 'bg-blue-500/10' : ''} ${isActive ? 'ring-2 ring-blue-500 z-10' : ''}`}
                                        onClick={() => {
                                            dispatch({ type: ActionType.SET_ACTIVE_CELL, payload: { row: r, col: c } });
                                            dispatch({ type: ActionType.SET_SELECTED_CELLS, payload: { start: { row: r, col: c }, end: { row: r, col: c }, sheetId: sheet.id } });
                                        }}
                                    >
                                        <Cell 
                                            row={r} 
                                            col={c} 
                                            cellData={cellData} 
                                            isActive={isActive} 
                                            isSelected={!!isSelected} 
                                            isEditing={state.isEditing && isActive} 
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const Sidebar: React.FC = () => {
    const { state, dispatch } = useSpreadsheet();
    const [aiInput, setAiInput] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [loading, setLoading] = useState(false);

    if (!state.sidebarOpen) return null;

    const handleAskAI = async () => {
        if (!aiInput.trim()) return;
        setLoading(true);
        const sheet = state.workbook.sheets.find(s => s.id === state.workbook.activeSheetId);
        const context = JSON.stringify(sheet?.data || {});
        const res = await askGemini(aiInput, context);
        setAiResponse(res || 'No response from AI.');
        setLoading(false);
    };

    return (
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col shadow-2xl z-50">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900">
                <h2 className="font-bold text-sm tracking-widest text-blue-400 uppercase">
                    {state.sidebarContent === 'ai_assistant' ? '✨ Gemini AI Assistant' : 'Sidebar'}
                </h2>
                <button className="text-gray-500 hover:text-white text-xl" onClick={() => dispatch({ type: ActionType.TOGGLE_SIDEBAR, payload: null })}>&times;</button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-6">
                {state.sidebarContent === 'ai_assistant' && (
                    <>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold uppercase">Prompt</label>
                            <textarea 
                                className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-sm text-gray-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                                rows={4}
                                placeholder="Example: 'Create a monthly sales summary table' or 'Write a formula to calculate growth rate between B2 and B12'..."
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                            />
                            <button 
                                disabled={loading}
                                className={`w-full py-2 rounded font-bold text-sm transition-all ${loading ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'}`}
                                onClick={handleAskAI}
                            >
                                {loading ? 'Thinking...' : 'Generate with Gemini'}
                            </button>
                        </div>
                        {aiResponse && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <label className="text-xs text-gray-400 font-bold uppercase">AI Suggestion</label>
                                <div className="bg-gray-900 border border-gray-700 rounded p-4 text-sm text-gray-200 leading-relaxed font-sans">
                                    {aiResponse}
                                </div>
                                <div className="flex space-x-2">
                                    <button className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs font-bold transition-colors">Apply Formula</button>
                                    <button className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs font-bold transition-colors" onClick={() => setAiResponse('')}>Clear</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className="p-4 bg-gray-900 border-t border-gray-700 text-[10px] text-gray-500 italic">
                Powered by Gemini 3 Flash
            </div>
        </div>
    );
};

const SheetTabs: React.FC = () => {
    const { state, dispatch } = useSpreadsheet();
    return (
        <div className="bg-gray-900 border-t border-gray-700 p-1 flex items-center space-x-1">
            {state.workbook.sheets.map(sheet => (
                <button
                    key={sheet.id}
                    className={`px-4 py-1.5 rounded-t text-xs font-medium transition-colors ${state.workbook.activeSheetId === sheet.id ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
                    onClick={() => dispatch({ type: ActionType.SET_ACTIVE_SHEET, payload: sheet.id })}
                >
                    {sheet.name}
                </button>
            ))}
            <button className="px-3 text-gray-500 hover:text-white transition-colors" title="Add Sheet">
                +
            </button>
        </div>
    );
};

const StatusBar: React.FC = () => {
    const { state } = useSpreadsheet();
    return (
        <div className="bg-gray-800 border-t border-gray-700 h-6 flex items-center px-4 justify-between text-[10px] text-gray-500 font-medium">
            <div className="flex items-center space-x-4">
                <span className="flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></span>
                    Online: {state.currentUserName}
                </span>
                <span>Workbook: {state.workbook.name}</span>
            </div>
            <div className="flex items-center space-x-4">
                <span>Cells: {state.workbook.sheets[0].dimensions.rows * state.workbook.sheets[0].dimensions.cols}</span>
                <span>Zoom: {Math.round(state.zoomLevel * 100)}%</span>
            </div>
        </div>
    );
};

const SpreadsheetApp: React.FC = () => {
    return (
        <SpreadsheetProvider>
            <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">
                {/* Global Header */}
                <div className="h-12 flex items-center px-4 bg-gray-900 border-b border-gray-800 shadow-sm z-50">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center mr-3 shadow-lg shadow-blue-500/20">
                        <span className="text-white font-black text-sm">S</span>
                    </div>
                    <h1 className="text-sm font-bold tracking-tight text-gray-200">Ultimate Enterprise <span className="text-blue-500 font-black">SHEETS</span></h1>
                    <div className="flex-grow"></div>
                    <div className="flex items-center space-x-4">
                        <div className="flex -space-x-2">
                            {[1,2,3].map(i => (
                                <div key={i} className="w-7 h-7 rounded-full border-2 border-gray-900 bg-gray-700 flex items-center justify-center text-[10px] font-bold">U{i}</div>
                            ))}
                        </div>
                        <button className="bg-blue-600 px-4 py-1.5 rounded text-xs font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/10">Share</button>
                    </div>
                </div>

                <Ribbon />
                <FormulaBar />
                
                <div className="flex flex-grow overflow-hidden">
                    <SpreadsheetGrid />
                    <Sidebar />
                </div>

                <SheetTabs />
                <StatusBar />
            </div>
        </SpreadsheetProvider>
    );
};

export default SpreadsheetApp;


export enum CellContentType {
    VALUE = 'value',
    FORMULA = 'formula',
    ERROR = 'error',
    IMAGE = 'image',
    CHART = 'chart',
    SPARKLINES = 'sparklines',
    CUSTOM_WIDGET = 'custom_widget',
}

export enum CellDataType {
    NUMBER = 'number',
    TEXT = 'text',
    BOOLEAN = 'boolean',
    DATE = 'date',
    DATETIME = 'datetime',
    CURRENCY = 'currency',
    PERCENTAGE = 'percentage',
    ARRAY = 'array',
    OBJECT = 'object',
    GEOSPATIAL = 'geospatial',
    MEDIA_REFERENCE = 'media_reference',
    CUSTOM = 'custom',
}

export interface CellStyle {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold' | 'lighter' | 'bolder' | number;
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline' | 'line-through';
    color?: string;
    backgroundColor?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    verticalAlign?: 'top' | 'middle' | 'bottom';
    wrapText?: boolean;
    numberFormat?: string;
    borderColor?: string;
    borderStyle?: string;
    borderWidth?: string;
    padding?: string;
}

export interface CellCoordinates {
    row: number;
    col: number;
}

export interface CellRange {
    start: CellCoordinates;
    end: CellCoordinates;
    sheetId: string;
}

export interface SpreadsheetCell {
    id: string;
    value: any;
    formula?: string;
    rawInput?: string;
    type: CellContentType;
    dataType: CellDataType;
    style?: CellStyle;
    dependencies?: string[];
    error?: { type: string; message: string; };
    mergedWith?: { start: CellCoordinates; end: CellCoordinates; };
}

export interface Sheet {
    id: string;
    name: string;
    data: { [key: string]: SpreadsheetCell };
    dimensions: { rows: number; cols: number };
    mergedCells: CellRange[];
    rowMetadata: { [rowIndex: number]: any };
    colMetadata: { [colIndex: number]: any };
    gridlineVisibility?: boolean;
    displayFormulas?: boolean;
}

export interface Workbook {
    id: string;
    name: string;
    sheets: Sheet[];
    activeSheetId: string;
    collaborators: any[];
    workbookSettings: any;
    namedRanges: any[];
    scriptProject?: any;
}

export enum ActionType {
    SET_WORKBOOK = 'SET_WORKBOOK',
    UPDATE_CELL = 'UPDATE_CELL',
    SET_ACTIVE_CELL = 'SET_ACTIVE_CELL',
    SET_SELECTED_CELLS = 'SET_SELECTED_CELLS',
    SET_FORMULA_BAR_VALUE = 'SET_FORMULA_BAR_VALUE',
    SET_EDITING_MODE = 'SET_EDITING_MODE',
    UNDO = 'UNDO',
    REDO = 'REDO',
    ADD_SHEET = 'ADD_SHEET',
    SET_ACTIVE_SHEET = 'SET_ACTIVE_SHEET',
    TOGGLE_SIDEBAR = 'TOGGLE_SIDEBAR',
    SET_SIDEBAR_CONTENT = 'SET_SIDEBAR_CONTENT',
    SET_ACTIVE_RIBBON_TAB = 'SET_ACTIVE_RIBBON_TAB',
    ADD_NOTIFICATION = 'ADD_NOTIFICATION',
    REMOVE_NOTIFICATION = 'REMOVE_NOTIFICATION',
    APPLY_CELL_STYLE = 'APPLY_CELL_STYLE',
    OPEN_DIALOG = 'OPEN_DIALOG',
    CLOSE_DIALOG = 'CLOSE_DIALOG',
    TOGGLE_GRIDLINES = 'TOGGLE_GRIDLINES',
    SET_CLIPBOARD = 'SET_CLIPBOARD',
    APPLY_PASTE = 'APPLY_PASTE',
    OPEN_FIND_REPLACE = 'OPEN_FIND_REPLACE',
    CLOSE_FIND_REPLACE = 'CLOSE_FIND_REPLACE',
    UPDATE_FIND_REPLACE_SETTINGS = 'UPDATE_FIND_REPLACE_SETTINGS',
    UPDATE_STATUS_MESSAGE = 'UPDATE_STATUS_MESSAGE',
    INSERT_ROW = 'INSERT_ROW',
    DELETE_ROW = 'DELETE_ROW',
    INSERT_COLUMN = 'INSERT_COLUMN',
    DELETE_COLUMN = 'DELETE_COLUMN',
    MERGE_CELLS = 'MERGE_CELLS',
    UNMERGE_CELLS = 'UNMERGE_CELLS',
    SET_ZOOM_LEVEL = 'SET_ZOOM_LEVEL',
    UPDATE_COLLABORATOR_PRESENCE = 'UPDATE_COLLABORATOR_PRESENCE',
    ADD_CHANGE_TO_HISTORY = 'ADD_CHANGE_TO_HISTORY',
}

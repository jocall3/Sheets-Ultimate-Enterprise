
import React from 'react';
import { SpreadsheetCell, CellContentType, CellDataType } from '../types';

interface CellProps {
  row: number;
  col: number;
  cellData?: SpreadsheetCell;
  isActive: boolean;
  isSelected: boolean;
  isEditing: boolean;
}

const Cell: React.FC<CellProps> = ({ row, col, cellData, isActive, isSelected, isEditing }) => {
  const displayValue = () => {
    if (!cellData) return '';
    if (cellData.type === CellContentType.ERROR) return cellData.error?.message || '#ERROR!';
    
    const val = cellData.value;
    if (val === null || val === undefined) return '';
    
    if (cellData.dataType === CellDataType.DATE && val instanceof Date) {
      return val.toLocaleDateString();
    }
    
    return val.toString();
  };

  const cellStyle: React.CSSProperties = {
    ...cellData?.style,
    display: 'flex',
    alignItems: 'center',
    justifyContent: cellData?.dataType === CellDataType.NUMBER ? 'flex-end' : 'flex-start',
    padding: '0 4px',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    whiteSpace: cellData?.style?.wrapText ? 'normal' : 'nowrap',
    textOverflow: 'ellipsis',
    fontSize: cellData?.style?.fontSize || '13px',
    color: cellData?.style?.color || (cellData?.type === CellContentType.ERROR ? '#ef4444' : '#e5e7eb'),
  };

  return (
    <div className="w-full h-full select-none" style={cellStyle}>
      {isEditing ? (
        <div className="absolute inset-0 bg-gray-700 z-50 p-0.5">
           <div className="w-full h-full bg-white text-black px-1 flex items-center">
             {/* Edit mode handled by formula bar primary, but visual indicator here */}
             <span className="animate-pulse">|</span> {displayValue()}
           </div>
        </div>
      ) : (
        <span>{displayValue()}</span>
      )}
      {cellData?.formula && !isEditing && (
        <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-blue-500 opacity-50" title="Cell contains a formula"></div>
      )}
    </div>
  );
};

export default React.memo(Cell);

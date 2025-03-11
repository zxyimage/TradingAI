// frontend/src/components/forms/DaySelector.tsx
import React from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface DaySelectorProps {
  selectedDays: number;
  onSelectDays: (days: number) => void;
  label?: string;
}

export function DaySelector({ selectedDays, onSelectDays, label = '数据天数' }: DaySelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="day-selector">{label}</Label>
      <Select
        value={selectedDays.toString()}
        onValueChange={(value) => onSelectDays(Number(value))}
      >
        <SelectTrigger id="day-selector">
          <SelectValue placeholder="选择天数" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">7天</SelectItem>
          <SelectItem value="14">14天</SelectItem>
          <SelectItem value="30">30天</SelectItem>
          <SelectItem value="60">60天</SelectItem>
          <SelectItem value="90">90天</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";

interface RubricLevel {
  score: string;
  label: string;
  description: string;
  examples?: string[];
}

interface RubricCriterion {
  criterion: string;
  description: string;
  levels: RubricLevel[];
}

interface RubricContent {
  title: string;
  introduction: string;
  criteria: RubricCriterion[];
}

interface RubricDisplayProps {
  content: RubricContent;
}

export function RubricDisplay({ content }: RubricDisplayProps) {
  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="mb-4 p-3 bg-white rounded-lg shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-bold text-center text-gray-900">{content.title}</h1>
          <div className="flex flex-col sm:flex-row justify-between gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-600">Name:</label>
              <div className="mt-0.5 h-5 border-b border-gray-300"></div>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-600">Date:</label>
              <div className="mt-0.5 h-5 border-b border-gray-300"></div>
            </div>
          </div>
          <p className="text-gray-600 text-xs text-center leading-tight">{content.introduction}</p>
        </div>
      </div>

      {/* Criteria Sections */}
      <div className="space-y-4">
        {content.criteria.map((criterion, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Criterion Header */}
            <div className="p-2 bg-gray-50 border-b">
              <h2 className="text-sm font-semibold text-gray-900 leading-tight">{criterion.criterion}</h2>
              <p className="text-xs text-gray-600 leading-tight">{criterion.description}</p>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-10 text-center p-1.5 text-xs">Score</TableHead>
                    <TableHead className="w-20 p-1.5 text-xs">Level</TableHead>
                    <TableHead className="p-1.5 text-xs w-[250px]">Description</TableHead>
                    <TableHead className="w-40 p-1.5 text-xs">Examples</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criterion.levels.map((level, levelIdx) => (
                    <TableRow key={levelIdx} className="hover:bg-gray-50">
                      <TableCell className="text-center font-bold text-sm p-1.5">{level.score}</TableCell>
                      <TableCell className="font-medium text-xs p-1.5">{level.label}</TableCell>
                      <TableCell className="text-gray-700 text-xs p-1.5 leading-snug max-w-[250px]">{level.description}</TableCell>
                      <TableCell className="p-1.5">
                        {level.examples && level.examples.length > 0 && (
                          <ul className="list-disc pl-3 text-gray-600">
                            {level.examples.map((example, exIdx) => (
                              <li key={exIdx} className="text-xs leading-tight">{example}</li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-gray-100">
              {criterion.levels.map((level, levelIdx) => (
                <div key={levelIdx} className="p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-xs">
                      {level.score}
                    </div>
                    <span className="font-medium text-xs text-gray-900">{level.label}</span>
                  </div>
                  <p className="text-xs text-gray-700 mb-1.5 leading-tight">{level.description}</p>
                  {level.examples && level.examples.length > 0 && (
                    <div className="bg-gray-50 rounded p-1.5">
                      <p className="text-xs font-medium text-gray-600 mb-1">Example:</p>
                      <ul className="list-disc pl-3 text-xs text-gray-600">
                        {level.examples.map((example, exIdx) => (
                          <li key={exIdx} className="leading-tight">{example}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
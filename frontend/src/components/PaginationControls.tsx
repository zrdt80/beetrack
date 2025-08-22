import React from "react";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationPrevious,
    PaginationNext,
} from "@/components/ui/pagination";

export type PaginationControlsProps = {
    page: number;
    pages: number;
    onChange: (page: number) => void;
    className?: string;
};

export const PaginationControls: React.FC<PaginationControlsProps> = ({
    page,
    pages,
    onChange,
    className,
}) => {
    const prevDisabled = page <= 1;
    const nextDisabled = page >= pages;
    const prev = () => onChange(Math.max(1, page - 1));
    const next = () => onChange(page < pages ? page + 1 : page);

    return (
        <Pagination className={className}>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        onClick={(e) => {
                            if (prevDisabled) {
                                e.preventDefault();
                                return;
                            }
                            prev();
                        }}
                        aria-disabled={prevDisabled}
                        className={
                            (prevDisabled
                                ? "pointer-events-none opacity-50 "
                                : "") +
                            "bg-gray-100 text-black hover:bg-white text-xs"
                        }
                    />
                </PaginationItem>
                <PaginationItem>
                    <span className="text-sm mx-4 text-gray-500">
                        Page {page} / {pages}
                    </span>
                </PaginationItem>
                <PaginationItem>
                    <PaginationNext
                        onClick={(e) => {
                            if (nextDisabled) {
                                e.preventDefault();
                                return;
                            }
                            next();
                        }}
                        aria-disabled={nextDisabled}
                        className={
                            (nextDisabled
                                ? "pointer-events-none opacity-50 "
                                : "") +
                            "bg-gray-100 text-black hover:bg-white text-xs"
                        }
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
};

export default PaginationControls;

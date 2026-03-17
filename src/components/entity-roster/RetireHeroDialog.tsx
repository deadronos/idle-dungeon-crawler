import { Skull } from "lucide-react";

import type { Entity } from "@/game/entity";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RetireHeroDialogProps {
    entity: Entity;
    onRetire: (entityId: string) => void;
}

export const RetireHeroDialog = ({ entity, onRetire }: RetireHeroDialogProps) => {
    if (entity.isEnemy || entity.id === "hero_1" || entity.level < 0) {
        return null;
    }

    const soulReward = Math.floor(entity.level / 5) * 10;

    return (
        <AlertDialog>
            <AlertDialogTrigger
                className="text-slate-500 hover:text-red-400 transition-colors bg-slate-800/50 hover:bg-slate-800 p-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 focus:ring-offset-slate-900"
                title={`Retire Hero for ${soulReward} Souls`}
            >
                <Skull size={14} />
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-900 border-slate-700 text-slate-200 shadow-2xl shadow-black/50 sm:max-w-[425px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Skull className="text-red-400" size={20} />
                        Retire {entity.name}?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-400 mt-2">
                        Are you sure you want to retire this hero? They will leave the party{" "}
                        <strong className="text-slate-200">permanently</strong> in exchange for{" "}
                        <strong className="text-fuchsia-400 font-bold">{soulReward} Hero Souls</strong>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
                    <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => onRetire(entity.id)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold tracking-wider"
                    >
                        Retire Hero
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

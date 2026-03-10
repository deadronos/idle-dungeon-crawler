import React from 'react';
import type { Entity } from '../game/entity';
import { formatNumber } from '../utils/format';

interface Props {
    title: string;
    entities: Entity[];
    alignRight?: boolean;
}

export const EntityRoster: React.FC<Props> = ({ title, entities, alignRight }) => {
    return (
        <div className={`roster-panel ${alignRight ? 'align-right' : ''}`}>
            <h2 className="roster-title">{title}</h2>
            <div className="roster-list">
                {entities.map(entity => (
                    <div key={entity.id} className={`entity-card ${entity.currentHp.lte(0) ? 'dead' : ''}`}>
                        <div className="entity-header">
                            <span className="entity-name">{entity.name}</span>
                            <span className="entity-level">Lv {entity.level}</span>
                        </div>
                        <div className="entity-image-wrapper">
                            <img src={entity.image} alt={entity.name} className="entity-portrait" />
                        </div>
                        <div className="entity-class">{entity.class}</div>

                        {/* HP Bar */}
                        <div className="bar-container hp-bar-container">
                            <div
                                className="bar-fill hp-fill"
                                style={{ width: `${Math.max(0, entity.currentHp.dividedBy(entity.maxHp).times(100).toNumber())}%` }}
                            />
                            <span className="bar-text">{formatNumber(entity.currentHp)} / {formatNumber(entity.maxHp)}</span>
                        </div>

                        {/* Resource Bar */}
                        <div className="bar-container resource-bar-container">
                            <div
                                className={`bar-fill resource-fill resource-${entity.class.toLowerCase()}`}
                                style={{ width: `${Math.max(0, entity.currentResource.dividedBy(entity.maxResource).times(100).toNumber())}%` }}
                            />
                            <span className="bar-text">{formatNumber(entity.currentResource)} / {formatNumber(entity.maxResource)}</span>
                        </div>

                        {/* ATB Bar */}
                        <div className="bar-container atb-bar-container">
                            <div
                                className="bar-fill atb-fill"
                                style={{ width: `${Math.min(100, entity.actionProgress)}%` }}
                            />
                        </div>

                        {/* Attributes (simplified) */}
                        {!entity.isEnemy && (
                            <div className="entity-exp-bar">
                                <div className="exp-fill" style={{ width: `${entity.exp.dividedBy(entity.expToNext).times(100).toNumber()}%` }} />
                            </div>
                        )}
                        {!entity.isEnemy && (
                            <div className="entity-stats-mini">
                                <span>STR: {entity.attributes.str}</span>
                                <span>DEX: {entity.attributes.dex}</span>
                                <span>INT: {entity.attributes.int}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

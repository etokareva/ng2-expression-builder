import { Visitor } from './expression.visitor';
import { AppError } from '../../infrastructure/error';

function stringify(value: any, type: string, isValid: boolean) {
    if (!isValid) {
        return '<span class="q-grid-markup-condition-value-invalid"></span>';
    }

    switch (type) {
        case 'text':
            return stringifyText(value);
        case 'number':
            return stringifyNumber(value);
        case 'date':
            return stringifyDate(value);
        default:
            return '' + value;
    }
}

function stringifyText(value: string) {
    return `<span class="q-grid-markup-condition-quote">'</span>
                <span class="q-grid-markup-condition-value q-grid-markup-condition-value-text">${value}</span>
            <span class="q-grid-markup-condition-quote">'</span>`;
}

function stringifyDate(value) {
    const date = new Date(value) as any;
    if (date !== 'Invalid Date' && !isNaN(date)) {
        return `<span class="q-grid-markup-condition-quote">'</span>
                    <span class="q-grid-markup-condition-value q-grid-markup-condition-value-date">${value}</span>
                <span class="q-grid-markup-condition-quote">'</span>`;
    }

    return `<span class="q-grid-markup-condition-quote">'</span>
                <span class="q-grid-markup-condition-value q-grid-markup-condition-value-date q-grid-markup-condition-error">${value}</span>
            <span class="q-grid-markup-condition-quote">'</span>`;
}

function stringifyNumber(value) {
    const number = parseFloat(value);
    if (!isNaN(number) && isFinite(number)) {
        return `<span class="q-grid-markup-condition-value q-grid-markup-condition-number">${value}</span>`;
    }

    return `<span class="q-grid-markup-condition-value q-grid-markup-condition-number q-grid-markup-condition-error">${value}</span>`;
}

function stringifyInteger(value) {
    const number = parseInt(value);
    if (!isNaN(number) && isFinite(number)) {
        return `<span class="q-grid-markup-condition-value q-grid-markup-condition-number">${value}</span>`;
    }

    return `<span class="q-grid-markup-condition-value q-grid-markup-condition-number q-grid-markup-condition-error">${value}</span>`;
}

export class MarkupVisitor extends Visitor {
    constructor(
        private label: (key: string) => string,
        private type: (key: string) => string,
        private isValid: (key: string, value: any) => boolean) {
        super();
    }

    visitGroup(group, depth) {
        if (group.right) {
            const l = this.visit(group.left, depth);
            const r = this.visit(group.right, depth);

            const expr = `<div class="q-grid-markup-node-left">${l}</div><span class="q-grid-markup-group-op">${group.op}</span><div class="q-grid-markup-node-right">${r}</div>`;
            return `<div class="q-grid-markup-node">${(depth > 1 ? `<span class="q-grid-markup-group-open">(</span>${expr}<span class="q-grid-markup-group-close">)</span>` : expr)}</div>`;
        }

        return `<div class="q-grid-markup-node">${this.visit(group.left, depth)}<div class="q-grid-markup-node">`;
    }

    visitUnary(condition) {
        switch (condition.op) {
            case 'isNotNull':
                return `<span class="q-grid-markup-condition-left">${this.label(condition.left)}</span><span class="q-grid-markup-condition-right q-grid-markup-condition-unary">is not empty</span>`;
            case 'isNull':
                return `<span class="q-grid-markup-condition-left">${this.label(condition.left)}</span><span class="q-grid-markup-condition-right q-grid-markup-condition-unary">is empty</span>`;
            default:
                throw new AppError('markup.visitor', `Invalid operation ${condition.op}`)
        }
    }

    visitBinary(condition) {
        let op;

        switch (condition.op) {
            case 'equals':
                op = '=';
                break;
            case 'notEquals':
                op = '&lt;&gt;';
                break;
            case 'greaterThanOrEquals':
                op = '&gt;='
                break;
            case 'greaterThan':
                op = '&gt;';
                break;
            case 'lessThanOrEquals':
                op = '&lt;=';
                break;
            case 'lessThan':
                op = '&lt;';
                break;
            case 'like':
                op = 'like';
                break
            case 'notLike':
                op = 'not like';
                break;
            case 'startsWith':
                op = 'starts with';
                break;
            case 'endsWith':
                op = 'ends with';
                break;
            default:
                throw new AppError('markup.visitor', `Invalid operation ${condition.op}`);
        }

        const isValid = this.isValid(condition.left, condition.right);
        return `<span class="q-grid-markup-condition-left">${this.label(condition.left)}</span>
                <span class="q-grid-markup-condition-op">${op}</span>
                <span class="q-grid-markup-condition-right">${stringify(condition.right, this.type(condition.left), isValid)}</span>`;
    }

    visitBetween(condition) {
        const isValid = this.isValid(condition.left, condition.right);
        return `<span class="q-grid-markup-condition-left">${this.label(condition.left)}</span>
                <span class="q-grid-markup-condition-op">between</span>
                <span class="q-grid-markup-condition-right">${stringify(condition.right[0], this.type(condition.left), isValid)}</span>
                <span class="q-grid-markup-condition-op">and</span>
                <span class="q-grid-markup-condition-right">${stringify(condition.right[1], this.type(condition.left), isValid)}</span>`;
    }

    visitIn(condition) {
        const isValid = this.isValid(condition.left, condition.right);
        return `<span class="q-grid-markup-condition-left">${this.label(condition.left)}</span>
                <span class="q-grid-markup-condition-op">in</span>
                <span class="q-grid-markup-condition-open">(</span>
                <span class="q-grid-markup-condition-right">${condition.right.map(item => stringify(item, this.type(condition.left), isValid)).join(', ')}</span>
                <span class="q-grid-markup-condition-close">)</span>`;
    }
}
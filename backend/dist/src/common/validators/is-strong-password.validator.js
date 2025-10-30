"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsStrongPasswordConstraint = void 0;
exports.IsStrongPassword = IsStrongPassword;
const class_validator_1 = require("class-validator");
const COMMON_PASSWORDS = [
    'password',
    'password123',
    '12345678',
    '123456789',
    'qwerty',
    'abc123',
    'letmein',
    'welcome',
    'admin',
    'admin123',
    'test123',
    'user123',
];
let IsStrongPasswordConstraint = class IsStrongPasswordConstraint {
    validate(password) {
        if (typeof password !== 'string') {
            return false;
        }
        if (password.length < 8) {
            return false;
        }
        if (password.length > 128) {
            return false;
        }
        if (!/[A-Z]/.test(password)) {
            return false;
        }
        if (!/[a-z]/.test(password)) {
            return false;
        }
        if (!/[0-9]/.test(password)) {
            return false;
        }
        if (!/[@$!%*?&#^()_+\-=[\]{};:'",.<>/\\|`~]/.test(password)) {
            return false;
        }
        if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
            return false;
        }
        return true;
    }
    defaultMessage(args) {
        const password = args.value;
        if (!password || password.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        if (password.length > 128) {
            return 'Password must not exceed 128 characters';
        }
        if (!/[A-Z]/.test(password)) {
            return 'Password must contain at least one uppercase letter';
        }
        if (!/[a-z]/.test(password)) {
            return 'Password must contain at least one lowercase letter';
        }
        if (!/[0-9]/.test(password)) {
            return 'Password must contain at least one number';
        }
        if (!/[@$!%*?&#^()_+\-=[\]{};:'",.<>/\\|`~]/.test(password)) {
            return 'Password must contain at least one special character (@$!%*?&#, etc.)';
        }
        if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
            return 'This password is too common. Please choose a stronger password';
        }
        return 'Password does not meet security requirements';
    }
};
exports.IsStrongPasswordConstraint = IsStrongPasswordConstraint;
exports.IsStrongPasswordConstraint = IsStrongPasswordConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ async: false })
], IsStrongPasswordConstraint);
function IsStrongPassword(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsStrongPasswordConstraint,
        });
    };
}
//# sourceMappingURL=is-strong-password.validator.js.map
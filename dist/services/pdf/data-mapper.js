"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapToPDFUser = mapToPDFUser;
exports.mapToPDFClient = mapToPDFClient;
function mapToPDFUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.companyInfo?.phone || user.phone,
        company: user.companyInfo?.name || null,
    };
}
function mapToPDFClient(client) {
    return {
        id: client.id,
        type: client.type,
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company,
        nip: client.nip,
        address: client.address,
        city: client.city,
        postalCode: client.postalCode,
    };
}

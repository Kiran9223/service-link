package com.kiran.servicelink.entity;

public enum Role {
    USER,
    SERVICE_PROVIDER,
    ADMIN;

    public String getAuthority() {
        return "ROLE_" + this.name();
    }
}

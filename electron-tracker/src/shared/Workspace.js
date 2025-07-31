const { v4: uuidv4 } = require('uuid');

class Workspace {
    constructor(name, color = '#81a1c1') {
        this.id = uuidv4();
        this.name = name;
        this.color = color;
        this.createdAt = new Date().toISOString();
        this.isDefault = false;
    }

    static fromJSON(data) {
        const workspace = new Workspace(data.name, data.color);
        workspace.id = data.id;
        workspace.createdAt = data.createdAt;
        workspace.isDefault = data.isDefault || false;
        return workspace;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            createdAt: this.createdAt,
            isDefault: this.isDefault
        };
    }
}

module.exports = { Workspace };
import { prisma } from "@/lib/prisma";

export type AgentStatus = "IDLE" | "WORKING" | "ERROR";

export class AgentLogger {
  private agentName: string;
  private department: string;

  constructor(agentName: string, department: string) {
    this.agentName = agentName;
    this.department = department;
  }

  async startTask(taskDescription: string) {
    await this.updateState("WORKING", taskDescription, `Démarrage : ${taskDescription}`);
  }

  async finishTask(resultLog: string = "Tâche terminée") {
    await this.updateState("IDLE", null, resultLog);
  }

  async logError(errorMsg: string) {
    await this.updateState("ERROR", "Erreur critique détectée", errorMsg);
  }

  private async updateState(status: AgentStatus, currentTask: string | null, logEntry: string) {
    try {
      const timestampedLog = `[${new Date().toISOString()}] ${logEntry}`;
      await prisma.agentActivity.upsert({
        where: { agentName: this.agentName },
        update: {
          status,
          currentTask,
          lastLog: timestampedLog,
        },
        create: {
          agentName: this.agentName,
          department: this.department,
          status,
          currentTask,
          lastLog: timestampedLog,
          history: [],
        },
      });
    } catch (error) {
      console.error(`Erreur AgentLogger (${this.agentName}):`, error);
    }
  }
}

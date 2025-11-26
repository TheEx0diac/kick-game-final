// Assuming Pusher is available globally via CDN
declare const Pusher: any;

export type ChatCallback = (content: string, user: string) => void;
export type LogCallback = (msg: string) => void;
export type StatusCallback = (status: string) => void;

class ChatService {
    private pusher: any = null;
    private channel: any = null;

    connect(
        appKey: string, 
        cluster: string, 
        channelId: string, 
        onMessage: ChatCallback,
        onLog: LogCallback,
        onStatus: StatusCallback
    ) {
        if (this.pusher) {
            this.disconnect();
        }

        try {
            onLog('Initializing Pusher...');
            this.pusher = new Pusher(appKey, { cluster: cluster, encrypted: true });

            this.pusher.connection.bind('state_change', (states: any) => {
                onLog(`Connection state: ${states.current}`);
                if (states.current === 'connected') {
                    onStatus('connected');
                    this.subscribe(channelId, onMessage, onLog);
                }
            });

            this.pusher.connection.bind('error', (err: any) => {
                onLog(`Pusher Error: ${err.error?.data?.message || err.type}`);
                onStatus('error');
            });

        } catch (e: any) {
            onLog(`Exception: ${e.message}`);
            onStatus('error');
        }
    }

    subscribe(channelId: string, onMessage: ChatCallback, onLog: LogCallback) {
        if (!this.pusher) return;
        const channelName = `chatrooms.${channelId}.v2`;
        this.channel = this.pusher.subscribe(channelName);

        this.channel.bind('pusher:subscription_succeeded', () => {
            onLog(`✅ Subscribed to ${channelName}`);
        });

        const handler = (data: any) => {
            let content = "";
            let user = "Unknown";
            try {
                let payload = data;
                if (typeof data === 'string') payload = JSON.parse(data);
                content = payload.content || payload.message || "";
                user = payload.sender?.username || payload.user?.username || "Unknown";
                if (content && user) {
                    onMessage(content, user);
                }
            } catch(e) { 
                console.error("Parse error", e);
            }
        };

        this.channel.bind('App\\Events\\ChatMessageEvent', handler);
        this.channel.bind('ChatMessageEvent', handler);
    }

    disconnect() {
        if (this.pusher) {
            this.pusher.disconnect();
            this.pusher = null;
        }
    }
}

export const chatService = new ChatService();
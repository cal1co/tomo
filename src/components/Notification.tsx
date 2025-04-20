import React, { useEffect, useState } from "react";
import "../styles/notification.css";
import { NotificationType } from "../types";

interface NotificationProps {
    type: NotificationType;
    message: string;
    duration?: number;
    onClose?: () => void;
}

const Notification: React.FC<NotificationProps> = ({
                                                       type,
                                                       message,
                                                       duration = 3000,
                                                       onClose,
                                                   }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            if (onClose) {
                onClose();
            }
        }, duration);

        return () => {
            clearTimeout(timer);
        };
    }, [duration, onClose]);

    const handleClose = () => {
        setVisible(false);
        if (onClose) {
            onClose();
        }
    };

    return visible ? (
        <div className={ `notification notification-${ type }` }>
            <div className="notification-content">{ message }</div>
            <button className="notification-close" onClick={ handleClose }>
                ×
            </button>
        </div>
    ) : null;
};

export default Notification;

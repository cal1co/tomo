import React, { useEffect, useState } from 'react';

const StandaloneCreateTicketHandler: React.FC = () => {
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        console.log('StandaloneCreateTicketHandler mounted');

        const handleShowCreateTicket = () => {
            console.log('Received show-create-ticket event');
            setShowCreate(true);
        };

        if (window.electron && typeof window.electron.receive === 'function') {
            window.electron.receive('show-create-ticket', handleShowCreateTicket);
            console.log('Registered for show-create-ticket events');
        } else {
            console.error('Electron API not available for receiving events');
        }

        return () => {
            if (window.electron && typeof window.electron.removeListener === 'function') {
                window.electron.removeListener('show-create-ticket');
                console.log('Unregistered from show-create-ticket events');
            }
        };
    }, []);

    useEffect(() => {
        if (showCreate) {
            const timer = setTimeout(() => {
                try {
                    const createTicketButton = document.querySelector('.create-ticket-button');
                    if (createTicketButton && createTicketButton instanceof HTMLElement) {
                        createTicketButton.click();
                        console.log('Triggered create ticket button click');
                    } else {
                        console.error('Create ticket button not found in DOM');
                    }
                } catch (error) {
                    console.error('Error triggering create ticket:', error);
                }

                setShowCreate(false);
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [showCreate]);

    return null;
};

export default StandaloneCreateTicketHandler;
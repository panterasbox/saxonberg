#ifndef CONDO_H
#define CONDO_H

#define CondoDir     "/zone/null/eternal/condos"
#define CondoServer  CondoDir "/server"
#define Elevator     CondoDir "/elevator"
#define Lobby        CondoDir "/lobby"
#define Landing      CondoDir "/landing"
#define Hallway      CondoDir "/hallway"
#define Keycard      CondoDir "/keycard"

#define UNITS_PER_FLOOR    10
#define FLOOR_MULTIPLIER   100

// elevator stuff
#define DIRECTION_NONE     0
#define DIRECTION_UP       1
#define DIRECTION_DOWN     2
#define ELEVATOR_STOPPED   0
#define ELEVATOR_MOVING    1
#define ELEVATOR_CLOSED    0
#define ELEVATOR_OPEN      1
#define BUTTON_AUTO        0x01
#define BUTTON_ELEVATOR    0x02
#define BUTTON_UP          0x04
#define BUTTON_DOWN        0x08

// hallway stuff
#define WING_NORTH         1
#define WING_SOUTH         2

#endif /* CONDO_H */

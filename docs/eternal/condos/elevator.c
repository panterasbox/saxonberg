// Devo 20131211
inherit RoomCode;

#include "condo.h"

#define MOVE_TIME 5

void extra_create();
void extra_init();
int do_press(string arg);
int add_stop(int floor, int button);
int start_elevator();
int move_elevator();
int stop_elevator();
int open_door();
int close_door();
private void setup_exits();
int query_current_floor();
int query_current_direction();
int query_moving();
int query_open();

int current_floor;
int current_direction;
int moving;
int open;

// ([ floor : buttons ])
mapping stops;

void extra_create() {
  set( "short", "Eternal Arms Interdimensional Condominiums, Elevator" );
  set( "long", "This is the elevator. It is brown." );
  set( "day_light", WELL_LIT );
  set( InsideP , 1 );
  set( NoCombatP, 1 );
  set( NoMagicP, 1 );
  set( "descs", ([
    ({ "door", "doors", "elevator door", "elevator doors" }) : 
    "",
    ({ "panel", "elevator panel" }) :
    ""
  ]) );
  current_floor = 1;
  current_direction = DIRECTION_NONE;
  moving = ELEVATOR_STOPPED;
  open = ELEVATOR_CLOSED;
  stops = ([ ]);
  setup_exits();
}

void extra_init() {
  add_action("do_press", "press");
}

int do_press(string arg) {
  arg = lower_case(arg);
  int floor;
  if (member( ([ "l", "l button", "lobby", "lobby button" ]), arg)) {
    floor = 1;
  } else {
    if (arg == "button") {
      tell_player(THISP, "Which floor do you want to go to?");
      return 1;
    }
    if ((sscanf(arg, "%d", floor) == -1) 
     && (sscanf(arg, "%d button", floor) == -1)) {
      notify_fail("Press what?\n");
      return 0;
    }
    if (floor < 1) {
      tell_player(THISP, "Sorry, the tower does not have a basement.");
      return 1;
    }
    if (floor > CondoServer->query_floors()) {
      tell_player(THISP, sprintf("Sorry, the tower only has %d floors.", 
             CondoServer->query_floors()));
      return 1;
    }
  }

  add_stop(floor, BUTTON_ELEVATOR);
  return 1;
}

/**
  * Add a stop. If necessary, closes the door, and starts the elevator moving.
  *
  * @param floor floor to stop on
  * @param button which button(s) should be "lit" 
  * @return non-zero if the stop was added
  */
int add_stop(int floor, int button) {
  foreach (int f, int b : stops) {
    // turn off any automated stops
    stops[f] &= ~BUTTON_AUTO;
  }
  if ((moving == ELEVATOR_STOPPED) && (current_floor == floor)) {
    open_door();
    return 0;
  } else {
    stops[floor] |= button;
    if (open == ELEVATOR_OPEN) {
      if (!find_call_out("close_door")) {
        call_out("close_door", 1);
      }
    } else if (moving == ELEVATOR_STOPPED) {
      if (!find_call_out("start_elevator")) {
        call_out("start_elevator", 1);
      }
    }
    return 1;
  }
}

/**
  * Start the elevator moving. At least one stop must be added and the door
  * must first be closed.
  * 
  * @return non-zero if the elevator was started
  */
int start_elevator() {
  remove_call_out("start_elevator");
  if (!sizeof(stops)) {
    return 0;
  }
  if (open == ELEVATOR_OPEN) {
    return 0;
  }
  moving = ELEVATOR_MOVING;
  call_out("move_elevator", MOVE_TIME);
  return 1;
}

/**
  * Move the elevator one floor in the current direction. Elevator must first
  * have been started, and must not be trying to move below or above the
  * bottom or top floors, respectively. On arrival to the new floor, the
  * elevator is stopped, if necessary.
  * 
  * @return non-zero if the elevator was moved
  */
int move_elevator() {
  remove_call_out("move_elevator");
  if (moving != ELEVATOR_MOVING) {
    return 0;
  }
  int result = 0;
  int stop = 0;
  switch (current_direction) {
    case DIRECTION_UP:
      if (current_floor >= CondoServer->query_floors()) {
        result = 0;
        stop = 1;
      } else {
        current_floor++;
        if (member(stops, current_floor) && 
            (stops[current_floor] & ~BUTTON_DOWN)) {
          // if a button other than DOWN is lit
          stop = 1;
        }
        result = 1;
      }
      break;
    case DIRECTION_DOWN:
      if (current_floor <= 1) {
        result = 0;
      } else {
        current_floor--;
        if (member(stops, current_floor) && 
            (stops[current_floor] & ~BUTTON_UP)) {
          // if a button other than UP is lit
          stop = 1;
        }
        result = 1;
      }
      break;
    case DIRECTION_NONE:
      result = 0;
      break;
  }
  if (stop) {
    stop_elevator();
  } else {
    call_out("move_elevator", MOVE_TIME);
  }
  return result;
}

/**
  * Disengages the elevator, if necessary, clears the current floor's 
  * stop buttons, and opens the door.
  * 
  * @return non-zero if the elevator was stopped
  */
int stop_elevator() {
  remove_call_out("stop_elevator");
  moving = ELEVATOR_STOPPED;
  stops[current_floor] &= ~BUTTON_AUTO;
  stops[current_floor] &= ~BUTTON_ELEVATOR;
  switch (current_direction) {
    case DIRECTION_UP:
      stops[current_floor] &= ~BUTTON_UP;      
      break;
    case DIRECTION_DOWN:
      stops[current_floor] &= ~BUTTON_DOWN;
      break;
  }
  if (!stops[current_floor]) {
    m_delete(stops, current_floor);
  } 
  if (!sizeof(stops)) {
    stops[current_floor] &= ~BUTTON_UP;      
    stops[current_floor] &= ~BUTTON_DOWN;
  }
  open_door();
  return 1;
}

/**
  * Open the elevator door. Elevator must not be moving. Door will 
  * automatically close five seconds later.
  * 
  * @return non-zero if the door is opened
  */
int open_door() {
  remove_call_out("open_door");
  if (moving != ELEVATOR_STOPPED) {
    return 0;
  }
  open = ELEVATOR_OPEN;
  setup_exits();
  remove_call_out("close_door");
  call_out("close_door", 5);
  return 1;
}

/**
  * Close the door and start the elevator. If necessary, changes direction.
  * Door may already be closed.
  * 
  * @return non-zero if the door is closed
  */
int close_door() {
  remove_call_out("close_door");
  open = ELEVATOR_CLOSED;
  setup_exits();
  if (!sizeof(stops) && (current_floor != 1)) {
    // automatically send the elevator to the first floor when not in use
    stops[1] = BUTTON_AUTO;
  }
  if (max(m_indices(stops)) < current_floor) {
    current_direction = DIRECTION_DOWN;
  } else if (min(m_indices(stops) > current_floor)) {
    current_direction = DIRECTION_UP;
  }
  if (sizeof(stops)) {
    if (find_call_out("start_elevator") == -1) {
      call_out("start_elevator", 1);
    }
  }
  return 1;
}

/**
  * Adds or removes bi-directional exits based on current floor and whether
  * or not the door is open.
  */
private void setup_exits() {
  if (open == ELEVATOR_OPEN) {
    if (current_floor == 1) {
      add( "exits", ([ "east" : Lobby ]) );
      Lobby->add( "exits", ([ "west" : Elevator ]) );
    } else {
      object landing = CondoServer->query_landing(current_floor);
      if (landing) {
        add( "exits", ([ "east" : object_name(landing) ]) );
        landing->add( "exits", ([ "west" : Elevator ]) );
      } else { 
        add( "exits", ([ "east" : VoidRoom ]) );
      }
    }
  } else {
    remove( "exits", "east" );
    if (current_floor == 1) {
      Lobby->remove( "exits", "west" );
    } else {
      object landing = CondoServer->query_landing(current_floor);
      if (landing) {
        landing->remove( "exits", "west" );
      }
    }
  }
}

int query_current_floor() {
  return current_floor;
}

int query_current_direction() {
  return current_direction;
}

int query_moving() {
  return moving;
}

int query_open() {
  return open;
}

// Daemon for moving netdead players out of the Lounge, by Anthrax 6/1/2015
#define INTERVAL 1800
#define CHAMBER "/zone/null/eternal/zombieroom"
#define TARGET "/zone/null/eternal/lounge/lounge"

status repeat_checks;

status is_zombie(object who) {
    if( !objectp(who) ) return 0;
    if( query_once_interactive(who) && !interactive(who) ) return 1;
    return 0;
}

void Dump() {
    object *zombies;
    zombies = filter( inventorya(load_object(TARGET)), "is_zombie" );
    printf("%O\n", zombies);
    printf("Next Check: %d\n", find_call_out("move_zombies") );
}

status toggle_repeating() {
    while(remove_call_out("move_zombies") != -1 ) {}; // clear any existing repeat calls
    if( repeat_checks ) return repeat_checks=0;
    call_out("move_zombies", 1);
    return repeat_checks=1;
}

status move_one_zombie( object who ) {
    if( !is_zombie(who) ) return 0;
    return move_object( who, CHAMBER );
}

void move_zombies() {
    filter( inventorya(load_object(TARGET)), "move_one_zombie" );
    if( repeat_checks && find_call_out("move_zombies") == -1 )
        call_out("move_zombies", INTERVAL);
    return;
}

create() { toggle_repeating(); }

#define TARGET "/zone/null/eternal/lounge/lounge"
inherit RoomCode;

extra_create() {
    set("short", "The Zombie Chamber");
    set("day_long", "This blank white expanse houses the bodies of the net-dead - zombies caught between interactivity and oblivion.");
  set("day_light", 80);
  set(NoTeleportInP,1);
   set(InsideP,1);
    set(NoStealP, 1);
    set(NoCombatP, 1);
    set("exits", ([ "out" : TARGET ]) );
}

extra_init() {
    if( IsWizard(THISP) ) return;
    add_action("leave", "", 2);
}

status leave(string str) {
    if( previous_object( caller_stack_depth() - 1 ) == THISP || str == "glance" )
      THISP->move_player("in a puff of smoke", TARGET, 1);
    return 0;
}

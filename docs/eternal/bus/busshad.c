#include "/zone/null/eternal/bus/bus.h"

object host;
 
int muf;
 
void sh_init( object who ) {
    muf = 0;
    host = who;
    host->add("exits", (["bus" : "@bus"]));
    shadow( host, 1 ); }
 
bus(string dir) {
  tell_room(host, PNAME+" steps onto the bus.\n", ({THISP}));
  tell_room(FINDO(BUS), PNAME+" steps onto the bus.\n");
  write("You step on the bus.\n");
  muf = 1;
  THISP->move_player("bus", FINDO(BUS));
  DRIVER->get_money(THISP);
  muf = 0; 
  return 1; }
 
query_muffled_exit() { return muf; }
 
post_long() { return "\nThe Eternal City commuter bus is parked outside.\n"; }
 
byebye() {
  unshadow();
  host->remove("exits", "bus");
  destruct(THISO); }

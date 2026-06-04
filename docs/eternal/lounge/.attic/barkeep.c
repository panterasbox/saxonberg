#include "/zone/null/eternal/eternal.h"
inherit MonsterCode;
inherit MonsterTalk;
 
void extra_create() {
  set_name("dave");
  add_alias("barkeep");
  add_alias("bartender");
  set_short("Dave the Barkeep");
  set_long(
    "This is Dave, from the old Moonlighting television series.  Ever\n"+
    "since ABC cancelled his show, he's been doing odd jobs here and\n"+
    "there \(most notably Bruce Willis impersonations\), then finally\n"+
    "decided to settle down in Eternal City and open up his own bar."+
    "\n");
  set_race("human");
  set_gender("male");
  set_chat_chance(80);
  set_chat_rate(30);
  add_phrase("Dave cleans some glasses.\n");
  add_phrase("Dave sings: There she was, just a-walkin' down the street!\n");
  add_phrase("Dave winks knowingly at you.\n");
  add_phrase("Dave sniffs the air.\n");
}

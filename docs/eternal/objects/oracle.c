/*
**  Transdimensional Intermultiversial Oracle
*/
 
#include "/zone/null/eternal/eternal.h"
inherit OracleCode;
 
create()
{
   ::create();
    set( "id", ({"machine","oracle"}) );
    set( "short", "a Transdimensional Intermultiversial Oracle" );
    set( "long",
      "This is the Transdimensional Intermultiversial "
      "Oracle.  It is an odd contraption that was discovered "
      "long ago by several adventurous souls who found that "
      "the Oracle could determine the properties of any item, "
      "even if those properties were hidden from the general "
      "aspects of that item.  However, it seems that the TDIM "
      "Oracle is a living machine, and its efforts exact a "
      "toll upon its workings.  Therefore, it cannot offer "
      "its services free of charge and requires coins in "
      "exchange for the identification of items; coins which "
      "are used in complex self-repair mechanisms deep within "
      "the heart of the machine.  You then notice a tingling "
      "sensation in your brain, which thins out into a voice, "
      "speaking to you mind-to-mind, which says, \"Welcome, "
      "flesh being.  Type 'price <item>' to determine my price "
      "to identify an item, type 'identify <item>' to "
      "identify an item, or type 'compare <damage|speed|"
      "efficacy> of <wep1> to <wep2>' "
      "to compare two weapons.  When identifying StuffCode, you "
      "may also 'identify <item> <status|fully>' to get more information "
      "about the condition of your StuffCode.\""
    );
}

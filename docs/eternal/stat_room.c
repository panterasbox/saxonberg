// EotL stat room by Someguy@EotL a long long time ago
#include "/zone/null/eternal/eternal.h"
#define NORTH "/zone/null/eternal/stat_room1"
inherit RoomPlusCode;

void extra_create()
{
    set( "short", "Temple of the Ages, Altar" );
    set( "day_long",
      "You stand before the altar of the Temple of the Ages.  Sitting high "
      "atop the altar is the representation of a huge, naked human, as "
      "sculpted from the blackest marble you have ever seen.  Other "
      "statues line the walls, one for every race, guild, and gender, each "
      "carved in exquisite detail.  A single candle illuminates the entire "
      "chamber.  The entrance from which you came lies to the north." );

    set( "day_light", TORCH_LIT );

    set( "exits",
      ([ "north" : NORTH, ]) );

    set( "descs", ([
	({ "altar" }) : "This is a huge altar which stands before "
	"you, softly glowing.  It seems to have magical powers.",
	({ "candle" }) : "The candle seems to magically remain the same "
	"size, even though it burns very brightly.",
      ]) );
    set( "reset_data", ([ "statue" : AdvancementCode,
      ]) );
/* Peaches (Eternal Cabal leader) said it was cool for me to re-enable this.
   Having the stat room be a PK zone sucks ass, in my opinion, and is yet
   another good way to piss off newbies and make people not like this mud.
   Which is bad... so I'm putting this back.  And don't bitch at me for
   not logging this in FCS since the file has been checked out by Alex
   since May of 2001 -DD
*/
    set(NoPKP,1);
}

void extra_init()
{
    /* Ok, this is really lame.
       Here's why:

	It's a kind of neat idea, the whole, "they
	won't know which it is, PK or NoPK after they pinch!"
	thing... except if yer trying to kill someone...
	pinch ; kill <player> ... oh that didn't work...
	pinch ; kill <player>  bume...
	stupid.
	So don't put this back unless you talk to me - DD

	What's lame (besides changing this file without logging it in FCS) is having
	this room be pk at all.  So if ya don't like it being at least interestingly
	no pk, it'll just be plain old no pk.  don't put it back unless you talk to me - M
	add_action("do_pinch","pinch");
    */
}

status do_pinch( string str )
{
    if( str!="nose" )
	return 0;
    else
	query( NoPKP ) ? set( NoPKP, 0 ) : set( NoPKP, 1 );
    tell_room(THISO,
      "When "+PNAME+" pinches Anestimos's nose, you feel a shudder pass through the room.\n",({THISI}) );
    tell_object(THISI,"When you pinch Anestimos's nose, you feel a shudder pass through the room.\n");
    return 1;
}

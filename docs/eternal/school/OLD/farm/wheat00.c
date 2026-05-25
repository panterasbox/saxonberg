inherit RoomPlusCode;

void extra_create()
{
    set("short","At the Northwestern Corner of a Vast Field of Wheat");
    set( "day_long",
      "You are standing at the very edge of the wheatfield.  You can go no further "
      "to the west and no further to the north.  To the west, the land falls "
      "away and all you can see is unending blackness.  To the north is a "
      "sheer cliff face that, unless you are the direct descendant of a "
      "mountain goat, is impassable to you.  "
      "To the south and to the east stretches row after row of golden "
      "fruitful grain."
    );
    set("descs", ([
	({ "grain","row","rows", "wheat" }) :
	"This grain is rich and plentiful.  It has taken root in the warm black soil that makes up "
	"this sheltered plain.  The stalks of grain line up in careful "
	"rows as far as your eye can see.",
	({"blackness","abyss"}) :
	"You peer into the darkness, but you can see nothing more but utter "
	"nothingness.  Not even the sound of your voice can penetrate the "
	"complete lack of anything.",
	({ "cliff", "face", "cliff face" }) :
	"This cliff face goes straight up for about 300 feet and then gradually "
	"inclines to form huge, sky-piercing peaks of granite.  As you incline "
	"your head to look at the cliff, high in the sky you see something "
	"floating along up there.  It's not a bird, it's not a star...  What "
	"could it be?",
      ]) );
    set(OutsideP,1);
    set("exits", ([
	"east":"/zone/null/eternal/school/farm/wheat01",
	"southeast":"/zone/null/eternal/school/farm/wheat11",
	"south":"/zone/null/eternal/school/farm/wheat10",
      ]) );
}

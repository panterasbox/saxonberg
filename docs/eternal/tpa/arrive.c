inherit RoomPlusCode;

void
extra_create()
{
  set( "short", "Eternal City Terminal: Arrival Gate" );
  set( "day_long", "An alcove has been constructed here against the back "
                   "wall of the room.  This alcove houses the teleport "
                   "console, and is where people appear as they arrive from "
                   "the other destinations on the TPA teleport network.  "
                   "Cameras mounted in the corners of the room record "
                   "people's actions as they come and go.  While the walls "
                   "of the rest of the terminal are conspicuously bare, "
                   "nearly every each this room is covered with "
                   "advertisements from various businesses around the city.  "
                   "An engraving above the exit back to the main station "
                   "hall reads, \"Welcome to Eternal City\"." );
  set( "day_light", PART_LIT );
  set( "night_light", PART_LIT );
  set( "exits", ([ "south" : "/zone/null/eternal/tpa/station" ]) );
  set( "descs", ([ ({ "alcove" }) :
                   "Since the alcove is only large enough for about two "
                   "people, you stay clear if the area lest you get bumped "
                   "around by other players teleporting to the room.",
                   ({ "camera", "cameras" }) :
                   "Though tinted glass domes prevent you from seeing "
                   "exactly where the cameras are pointed, irrational "
                   "paranoia suggests they're all pointed at you.",
                   ({ "engraving" }) :
                   "A tiny plate has been affixed to the engraving.  It "
                   "reads, \"Paid for by the Eternal City Chamber of "
                   "Commerce\".",
                   ({ "exit" }) :
                   "A doorway to the south leads back to the main hall of "
                   "terminal.",
                   ({ "advertisements", "ads", "advertisement", "ad" }) :
                   "@read_ad" ]) );
  set( InsideP, 1 );
  return;
}

string
read_ad()
{
  mixed *ads = ({ 
    ({ "Everything, Inc.",  
       "We've got long swords!"  }),
    ({ "Bed & Breakfast", 
       "We've got one of the nicest lobbies in town, BUT YOU WOULDN'T KNOW THAT WOULD YOU????? YOU JUST WALK UP TO THE STORAGE OBJECT THINKING NO ONE CARES ABOUT OUR LOBBY WELL I CARE DAMMIT SO FUCK YOU ALL!!!" }),
    ({ "Snak-O-Rama", 
       "Disgusting, yet expensive!" }),
    ({ "Eight Ball", 
       "WE ARE NOT, NOR HAVE WE EVER BEEN A SECRET HIDEOUT.  Thank you." }),
    ({ "Paranoid C&A", 
       "If Gwain don't got it, somebody probably killed him." }),
    ({ "Eternal Savings & Loan", 
       "Well we've got savings at least." }),
    ({ "Dr. Frankenstein's Body Shop", 
       "Where else you gunna go...Newhaven?" }),
    ({ "Anarchy Interdimensional", 
       "Shop here, or Kilbor will blow up your house." }),
    ({ "E.C. Library", 
       "Because you can never read Lawrence of Arabia too many times." }),
    ({ "Dave's Throne Room",
       "Coming this fall on FOX!" }),
    ({ "Temple of Ages",
       "Like a motherfucker." }),
    ({ "THIS SPACE FOR RENT: Want to place an ad?  Mail Ahab." })
  });
  int i = random(sizeof(ads));
  if( sizeof(ads[i]) < 2 )
    return ads[i][0];
  else
    return format( ads[i][1], THISP->query_page_width(), ads[i][0]+": " );
}

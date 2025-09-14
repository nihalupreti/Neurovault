import AddMaterials from "@/components/addMaterials";
import AvatarMenu from "@/components/avatarMenu";
import MainBody from "@/components/mainBody";
import SearchBar from "@/components/searchBar";

export default async function Home() {
  return (
    <>
      <header className="sticky top-0 bg-gray-900 z-50">
        <div className="flex justify-between items-center py-3 px-70">
          <div className="flex items-center">
            {/* <img src="/path" alt="" /> */}
            <h1 className="font-bold text-xl text-white">Neurovault</h1>
          </div>
          <SearchBar />
          <div className="flex items-center space-x-4">
            <AddMaterials />
            <AvatarMenu />
          </div>
        </div>
        <hr className="h-px bg-gray-200 border-0 dark:bg-gray-700" />
      </header>

      <MainBody />
    </>
  );
}
